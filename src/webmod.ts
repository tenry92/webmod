/*
 *
 * WebMod, Version 0.2.0 (Pre-Alpha)
 *
 * Author: Simon "Tenry" Burchert
 *
 */

import * as util from './util';
import {Loader} from './loader';
import {PatternData, RowData, CellData, Instrument, Sample, Player} from './player';
import {ItLoader} from './formats/it';
import {ModLoader} from './formats/mod';
import {S3mLoader} from './formats/s3m';
import {XmLoader} from './formats/xm';

/**
 * Module data container, stateless.
 */
export class Module {
  /**
   * Name or title of the module file.
   */
  name: string = '';
  
  /**
   * File format. Can be: 'MOD', 'S3M', 'XM', 'IT'.
   */
  format: string = '';
  
  /**
   * Sub format string.
   */
  subFormat: string = '';
  
  /**
   * Instrument list.
   */
  instruments: Instrument[];
  
  /**
   * Sample list.
   */
  samples: Sample[] = [];
  
  /**
   * Number of channels.
   */
  channelCount: number = 0;
  
  /**
   * Total number of song positions.
   */
  positionCount: number = 0;
  
  /**
   * Restart position.
   */
  restart: number = 0;
  
  /**
   * Pattern order.
   */
  patternTable: number[] = [];
  
  /**
   * Pattern list.
   */
  patterns: PatternData[] = [];
  
  /**
   * Initial tempo.
   */
  initialTempo: number;
  
  /**
   * Initial speed.
   */
  initialSpeed: number;
  
  /**
   * Remove this please.
   */
  audioContext: AudioContext;
  
  /**
   * Audio player.
   */
  private player: Player;

  private destination: AudioNode;
  
  constructor(ctx: AudioContext) {
    if(!ctx) ctx = new AudioContext();
    
    this.audioContext = ctx;
  }
  
  addEventListener(type: string, listener: Function) {
    if(!this.player) {
      this.player = new Player(this);
    }
    
    this.player.addEventListener(type, listener);
  }
  
  removeEventListener(type: string, listener: Function) {
    if(!this.player) {
      this.player = new Player(this);
    }
    
    this.player.removeEventListener(type, listener);
  }

  connect(destination: AudioNode) {
    this.destination = destination;

    if(this.player) {
      this.player.connect(destination);
    }
  }
  
  /**
   * Start playback.
   */
  start() {
    if(!this.player) {
      this.player = new Player(this);

      if(this.destination) {
        this.player.connect(this.destination);
      }
    }
    this.player.start();
  }
  
  /**
   * Stop playback.
   */
  stop() {
    if(this.player) {
      this.player.stop();
    }
  }
  
  isPlaying() {
    return this.player && this.player.isPlaying();
  }
  
  rowToString(position?: number, row?: number) {
    if(!this.player) return '-';
    
    let delta = 0;
    if(position && row == null) {
      delta = position;
      position = undefined;
    }
    if(row == null) {
      if(!this.player.posRowAtTime.length) {
        position = row = 0;
      } else {
        let now = this.audioContext.currentTime;
        
        let i = 0;
        while(i < this.player.posRowAtTime.length) {
          let item = this.player.posRowAtTime[i];
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
    
    let pattern = this.patterns[this.patternTable[position]];
    let rowData = pattern.rows[row];
    
    let periodToNote = function(period) {
      if(!period) return '---';
      
      let noteList = 'C- C# D- D# E- F- F# G- G# A- A# B-'.split(' ');
      let periodTable = ('1712 1616 1525 1440 1357 1281 1209 1141 1077 1017 961 907 ' + // Octave 3
                        '856 808 762 720 678 640 604 570 538 508 480 453 ' + // Octave 4
                        '428 404 381 360 339 320 302 285 269 254 240 226 ' + // Octave 5
                        '214 202 190 180 170 160 151 143 135 127 120 113 ' + // Octave 6
                        '107 101 95 90 85 80 76 71 67 64 60 57').split(' '); // Octave 7
      
      let index = periodTable.indexOf(period.toString());
      if(index == -1) return '???';
      
      let octave = Math.floor(index / 12) + 3;
      return noteList[index % 12] + octave;
    };
    
    let str = '';
    rowData.cells.forEach((cell, idx) => {
      str += periodToNote(cell.period) + ' ';
      
      if(cell.instrument) {
        str += ('0' + cell.instrument.id).substr(-2) + ' ';
      } else str += '-- ';
      
      if(cell.effectType && cell.effectValue) {
        //str += cell.effectType.toString(16).toUpperCase();
        str += cell.effectType.substr(cell.effectType.indexOf(':') + 1);
        let valStr = cell.effectValue.toString(16).toUpperCase();
        if(valStr.length == 1) valStr = '0' + valStr;
        str += valStr;
      } else str += '---';
      
      if(idx != rowData.cells.length - 1) str += ' | ';
    });
    
    return str;
  }
  
  private getCurrentRowPlaybackItem() {
    if(!this.player || !this.player.posRowAtTime.length) {
      return null;
    }
    else {
      let now = this.audioContext.currentTime;
      
      let i = 0;
      while(i < this.player.posRowAtTime.length) {
        let item = this.player.posRowAtTime[i];
        if (item.time > now) break;
        ++i;
      }
      
      return this.player.posRowAtTime[i];
    }
  }
  
  get currentPos(): number {
    let item = this.getCurrentRowPlaybackItem();
    if(!item) return 0;
    return item.position;
  }
  
  set currentPos(value: number) {
    let resume = this.isPlaying();
    this.player.stop();
    this.player.currentPos = value;
    this.player.currentRow = 0;
    if(resume) this.player.start();
  }
  
  get currentRow(): number {
    let item = this.getCurrentRowPlaybackItem();
    if(!item) return 0;
    return item.row;
  }
  
  get currentSpeed(): number {
    let item = this.getCurrentRowPlaybackItem();
    if(!item) return 6;
    return item.speed;
  }
  
  get currentTempo(): number {
    let item = this.getCurrentRowPlaybackItem();
    if(!item) return 125;
    return item.tempo;
  }
}

export function createModuleFromBuffer(ctx: AudioContext, data: ArrayBuffer) {
  /* todo: async loading using Web Worker */
  return new Promise((resolve, reject) => {
    try {
      let f = new util.DataReader(data);
      
      let loader = null;
      
      if(ItLoader.isIt(f)) {
        loader = ItLoader;
      } else if(XmLoader.isXm(f)) {
        loader = XmLoader;
      } else if(S3mLoader.isS3m(f)) {
        loader = S3mLoader;
      } else if(ModLoader.isMod(f)) {
        loader = ModLoader;
      } else {
        throw new Error('Unrecognized file format.');
      }
      
      let mod = new Module(ctx);
      
      (new loader(mod)).load(f);
      
      resolve(mod);
    } catch(err) {
      reject(err);
    }
  });
}
