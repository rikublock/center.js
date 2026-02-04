export type Options = {
  width: number;
  height: number;
  text: string;
  fontColor: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  shape: "square" | "circle" | "rounded";
  backgroundColor: string;
};

const defaultOptions = {
  width: 128,
  height: 128,
  text: "C",
  fontColor: "white",
  fontFamily: "Helvetica",
  fontSize: 64,
  fontWeight: "400",
  fontStyle: "normal",
  shape: "square" as const,
  backgroundColor: "black",
};

export class CenterJS {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private opts: Options;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to obtain 2D rendering context from canvas");
    }
    this.ctx = ctx;
    this.opts = defaultOptions;
  }

  generate(options: Options): HTMLCanvasElement {
    /**
     * Override defaults with options.
     */
    this.opts = Object.assign({}, defaultOptions, options);

    /**
     * Set the width and height of the canvas as 2x of the desired width and
     * height. Use the style attribute of the canvas to set the desired width
     * and height of the canvas then scale the content up by a factor of 2. This
     * will allow support for retina displays.
     */
    this.canvas.width = 2 * this.opts.width;
    this.canvas.height = 2 * this.opts.height;
    this.canvas.style.width = this.opts.width + "px";
    this.canvas.style.height = this.opts.height + "px";
    this.ctx.scale(2, 2);

    /**
     * Draw and return the canvas.
     */
    this._drawBackground();
    this._drawText();

    return this.canvas;
  }

  private _drawBackground(): void {
    switch (this.opts.shape) {
      case "square":
        this._drawSquare();
        break;
      case "circle":
        this._drawCircle();
        break;
      case "rounded":
        this._drawRounded();
        break;
      default:
        this._drawSquare();
        break;
    }
  }

  private _drawSquare(): void {
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.opts.width, this.opts.height);
    this.ctx.fillStyle = this.opts.backgroundColor;
    this.ctx.fill();
  }

  private _drawCircle(): void {
    this.ctx.beginPath();
    this.ctx.arc(
      this.opts.width / 2,
      this.opts.height / 2,
      this.opts.height / 2,
      0,
      2 * Math.PI,
      false,
    );
    this.ctx.fillStyle = this.opts.backgroundColor;
    this.ctx.fill();
  }

  private _drawRounded(): void {
    this.ctx.beginPath();
    const radius = this.opts.height / 10;
    this.ctx.moveTo(this.opts.width, this.opts.height);
    this.ctx.arcTo(0, this.opts.height, 0, 0, radius);
    this.ctx.arcTo(0, 0, this.opts.width, 0, radius);
    this.ctx.arcTo(
      this.opts.width,
      0,
      this.opts.width,
      this.opts.height,
      radius,
    );
    this.ctx.arcTo(
      this.opts.width,
      this.opts.height,
      0,
      this.opts.height,
      radius,
    );
    this.ctx.fillStyle = this.opts.backgroundColor;
    this.ctx.fill();
  }

  private _drawText(): void {
    this.ctx.fillStyle = this.opts.fontColor;
    this.ctx.font = this._fontString();
    this.ctx.textBaseline = "alphabetic";
    this.ctx.textAlign = "center";
    const offsets = this._measureOffsets(this.opts.text, this.opts.fontSize);
    const x = this.opts.width / 2 + offsets.horizontal;
    const y = this.opts.height / 2 + offsets.vertical;
    this.ctx.fillText(this.opts.text, x, y);
  }

  /**
   * Offsets are the differece between the center of the canvas and the center
   * of the text on the canvas.
   */
  private _measureOffsets(text: string, fontSize: number) {
    /**
     * Create and setup canvas
     */
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to obtain 2D rendering context from canvas");
    }
    ctx.font = this._fontString();

    /**
     * Make sure that there is enough room on the canvas for the text. Changing
     * the width or height of a canvas element clears the content so you need
     * to set the font again.
     */
    canvas.width = 2 * ctx.measureText(text).width;
    canvas.height = 2 * fontSize;

    /**
     * Center the text vertically and horizontally using the build in canvas
     * functionality (textBaseline and textAlign). We're going to measure how
     * far off the text is from the actual center since the textBaseline and
     * textAlign are not always accurate.
     */
    ctx.font = this._fontString();
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    /**
     * Get image data so that we can iterate of every RGBA pixel.
     */
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    let textTop: any;
    let textBottom: any;
    for (let y = 0; y <= canvas.height; y++) {
      for (let x = 0; x <= canvas.width; x++) {
        let r_index = 4 * (canvas.width * y + x);
        let r_value = data[r_index];

        if (r_value === 255) {
          if (!textTop) {
            textTop = y;
          }
          textBottom = y;
          break;
        }
      }
    }

    /**
     * Vertical offset is the difference between the horizontal center of the
     * canvas and the horizontal center of the text on the canvas.
     */
    const canvasHorizontalCenterLine = canvas.height / 2;
    const textHorizontalCenterLine = (textBottom - textTop) / 2 + textTop;

    let textLeft: any;
    let textRight: any;
    for (let x = 0; x <= canvas.width; x++) {
      for (let y = 0; y <= canvas.height; y++) {
        let r_index = 4 * (canvas.width * y + x);
        let r_value = data[r_index];

        if (r_value === 255) {
          if (!textLeft) {
            textLeft = x;
          }
          textRight = x;
          break;
        }
      }
    }

    /**
     * Horizontal offset is the difference between the vertical center of the
     * canvas and the vertical center of the text on the canvas.
     */
    const canvasVerticalCenterLine = canvas.width / 2;
    const textVerticalCenterLine = (textRight - textLeft) / 2 + textLeft;

    return {
      vertical: canvasHorizontalCenterLine - textHorizontalCenterLine,
      horizontal: canvasVerticalCenterLine - textVerticalCenterLine,
    };
  }

  private _fontString(): string {
    return `${this.opts.fontStyle} ${this.opts.fontWeight} ${this.opts.fontSize}px ${this.opts.fontFamily}`;
  }
}

export default CenterJS;
