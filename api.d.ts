declare module WebMod {
  export class Module {
    currentPos: number;
    currentRow: number;
    currentSpeed: number;
    currentTempo: number;
    
    /**
     * @param data Array buffer containing the raw module file data.
     * @param ctx If provided, this module will use an existing audio context.
     *   Otherwise it creates a new audio context.
     */
    constructor(data: ArrayBuffer, ctx?: AudioContext);
    
    /**
     * Start module playback.
     */
    start(): void;
    
    /**
     * Stop module playback.
     */
    stop(): void;
  }
}