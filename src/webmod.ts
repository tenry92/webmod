/*
 *
 * WebMod, Version 0.1.2 (Pre-Alpha)
 *
 * Author: Simon "Tenry" Burchert
 *
 */

module WebMod {
  export class Module {
    /** Name / title of the module file. */
    name: string = '';
    instruments: Instrument[];
    samples: Sample[] = [];
    channelCount: number = 0;
    /** Total number of available positions. */
    positionCount: number = 0;
    /** Restart position. */
    restart: number = 0;
    patternTable: number[] = [];
    patterns: PatternData[] = [];
    
    initialTempo: number;
    initialSpeed: number;
    
    
    audioContext: AudioContext;
    private player: Player;
    
    /**
     * @param data Array buffer containing the raw module file data.
     * @param ctx If provided, this module will use an existing audio context.
     *   Otherwise it creates a new audio context.
     */
    constructor(data: ArrayBuffer, ctx?: AudioContext) {
      var f = new Util.DataReader(data);
      if(!ctx) ctx = new AudioContext();
      
      this.audioContext = ctx;
      
      var loader = null;
      
      if(ItLoader.isIt(f)) {
        loader = ItLoader;
      }
      else if(XmLoader.isXm(f)) {
        loader = XmLoader;
      }
      else if(S3mLoader.isS3m(f)) {
        loader = S3mLoader;
      }
      else if(ModLoader.isMod(f)) {
        loader = ModLoader;
      }
      else {
        throw new Error('Unrecognized file format.');
      }
      
      (new loader(this)).load(f);
    }
    
    
    private reset() {
      this.player = new Player(this.audioContext, this);
    }
    
    /**
     * Start playback.
     */
    start() {
      if(!this.player) {
        this.reset();
        this.player.start();
      }
    }
    
    /**
     * Stop playback.
     */
    stop() {
      if(this.player) {
        this.player.stop();
        this.player = null;
      }
    }
    
    rowToString(position?: number, row?: number) {
      if(!this.player) return '-';
      
      var delta = 0;
      if(position && row == null)
      {
        delta = position;
        position = undefined;
      }
      if(row == null)
      {
        if(!this.player.posRowAtTime.length)
        {
          position = row = 0;
        }
        else
        {
          var now = this.audioContext.currentTime;
          
          var i = 0;
          while(i < this.player.posRowAtTime.length)
          {
            var item = this.player.posRowAtTime[i];
            if(item.time > now) break;
            ++i;
          }
          
          position = this.player.posRowAtTime[i].position;
          row = this.player.posRowAtTime[i].row + delta;
          
          //if(row < 0) { row += 64; --position; }
          //if(row > 63) { row -= 63; ++position; }
          if(row < 0 || row > 63) return '';
          
          if(position < 0) return '';
          if(position >= this.positionCount) return '';
        }
      }
      
      var pattern = this.patterns[this.patternTable[position]];
      var rowData = pattern.rows[row];
      
      var periodToNote = function(period)
      {
        if(!period) return '---';
        
        var noteList = 'C- C# D- D# E- F- F# G- G# A- A# B-'.split(' ');
        var periodTable = ('1712 1616 1525 1440 1357 1281 1209 1141 1077 1017 961 907 ' + // Octave 3
                          '856 808 762 720 678 640 604 570 538 508 480 453 ' + // Octave 4
                          '428 404 381 360 339 320 302 285 269 254 240 226 ' + // Octave 5
                          '214 202 190 180 170 160 151 143 135 127 120 113 ' + // Octave 6
                          '107 101 95 90 85 80 76 71 67 64 60 57').split(' '); // Octave 7
        
        var index = periodTable.indexOf(period.toString());
        if(index == -1) return '???';
        
        var octave = Math.floor(index / 12) + 3;
        return noteList[index % 12] + octave;
      };
      
      var str = '';
      rowData.cells.forEach((cell, idx) => {
        str += periodToNote(cell.period) + ' ';
        
         if(cell.instrument)
        {
          str += ('0' + cell.instrument.id).substr(-2) + ' ';
        }
        else str += '-- ';
        
        if(cell.effectType && cell.effectValue)
        {
          //str += cell.effectType.toString(16).toUpperCase();
          str += cell.effectType.substr(cell.effectType.indexOf(':') + 1);
          var valStr = cell.effectValue.toString(16).toUpperCase();
          if(valStr.length == 1) valStr = '0' + valStr;
          str += valStr;
        }
        else str += '---';
        
        if(idx != rowData.cells.length - 1) str += ' | ';
      });
      
      return str;
    }
    
    private getCurrentRowPlaybackItem() {
      if(!this.player || !this.player.posRowAtTime.length) {
        return null;
      }
      else {
        var now = this.audioContext.currentTime;
        
        var i = 0;
        while(i < this.player.posRowAtTime.length) {
          var item = this.player.posRowAtTime[i];
          if (item.time > now) break;
          ++i;
        }
        
        return this.player.posRowAtTime[i];
      }
    }
    
    get currentPos(): number {
      var item = this.getCurrentRowPlaybackItem();
      if(!item) return 0;
      return item.position;
    }
    
    set currentPos(value: number) {
      this.player.stop();
      this.player.currentPos = value;
      this.player.currentRow = 0;
      this.player.start();
    }
    
    get currentRow(): number {
      var item = this.getCurrentRowPlaybackItem();
      if(!item) return 0;
      return item.row;
    }
    
    get currentSpeed(): number {
      var item = this.getCurrentRowPlaybackItem();
      if(!item) return 6;
      return item.speed;
    }
    
    get currentTempo(): number {
      var item = this.getCurrentRowPlaybackItem();
      if(!item) return 125;
      return item.tempo;
    }
  }
}