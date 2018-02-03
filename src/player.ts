import * as util from './util';
import {Module} from './webmod';

export class Instrument {
  name: string;
  
  keymap: Sample[] = [];
  defaultSample: Sample = null;
  
  volumeEnvelope: number[] = [];
  volumeSustainPoint: number;
  volumeSustainStart: number;
  volumeSustainEnd: number;
  volumeLoopStart: number;
  volumeLoopEnd: number;
  
  panningEnvelope: number[] = [];
  panningSustainPoint: number;
  panningSustainStart: number;
  panningSustainEnd: number;
  panningLoopStart: number;
  panningLoopEnd: number;
  
  volumeType;
  panningType;
  vibratoType;
  vibratoSweep;
  vibratoDepth;
  vibratoRate;
  volumeFadeout: number;
  newNoteAction: string; // 'cut', 'continue', 'off', 'fade'
  dupCheckType: string; // 'off', 'note', 'sample', 'instrument'
  dupCheckAction: string; // 'cut', 'off', 'fade'
  
  constructor(public id: number) {
    
  }
}

export class Sample {
  /** Buffer containing the sample data. */
  buffer: AudioBuffer;
  
  name: string;
  /** Length of sample measured in frames. */
  length: number;
  finetune: number;
  /** 0..64. */
  volume: number;
  /** 0..255 */
  panning: number;
  /** Repeat offset. */
  repeat: number;
  /** Repeat length. */
  repeatLength: number;
  
  constructor(public id: number) {
    
  }
}

export class CellData {
  instrument: Instrument;
  period: number; /* MOD */
  note: number; /* XM */
  /**
   * Something like 'MOD:C'.
   */
  effectType: string;
  /**
   * The effect value XY (0..255).
   */
  effectValue: number;
  volume: number; /* XM */
  effectParam: number; /* XM */
  
  /**
   * The effect value X (0..15).
   */
  get effectValueX() {
    return this.effectValue >> 4;
  }
  /**
   * The effect value Y (0..15).
   */
  get effectValueY() {
    return this.effectValue & 0xF;
  }
}

export class RowData {
  cells: CellData[] = [];
}

export class PatternData {
  rows: RowData[] = [];
}

/**
 * Channel configuration and current state.
 */
export class Channel {
  /**
   * Gain (volume) node for this channel.
   */
  gainNode: GainNode;
  
  /**
   * Latest instrument that has been played on this channel.
   */
  instrument: Instrument = null;
  
  //period = 0;
  
  //frequency = 0;
  
  note = 0;
  
  targetNote = 0;
  
  /**
   * Currently playing source node.
   */
  sourceNode: AudioBufferSourceNode = null;
  
  /**
   * Gain (volume) node for currently playing voice.
   */
  voiceGainNode: GainNode = null;
  
  /**
   * Current volume for currently playing voice (0..64).
   */
  voiceVolume = 0;
  
  constructor(public audioContext: AudioContext) {
    this.gainNode = audioContext.createGain();
    this.gainNode.gain.setValueAtTime(1, this.gainNode.context.currentTime);
  }
  
  playInstrument(instrument?: Instrument, note?: number, offset?: number) {
    if(!instrument) instrument = this.instrument;
    else this.instrument = instrument;
    if(!note) note = this.note;
    else this.note = note;
    
    if(!this.instrument || !this.note) return null;
    
    let sample = this.instrument.keymap[note - 1] || this.instrument.defaultSample;
    if(this.sourceNode) this.sourceNode.stop(offset);
    this.voiceVolume = sample.volume;
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = sample.buffer;
    note += sample.finetune / 128;
    let frequency = util.noteToFramerate(note) / this.audioContext.sampleRate;
    this.sourceNode.playbackRate.value = frequency;
    if(sample.repeatLength) {
      this.sourceNode.loop = true;
      this.sourceNode.loopStart = (sample.repeat / sample.length) * sample.buffer.duration;
      this.sourceNode.loopEnd = ((sample.repeat + sample.repeatLength) / sample.length) * sample.buffer.duration;
    }
    
    this.voiceGainNode = this.audioContext.createGain();
    this.voiceGainNode.gain.setValueAtTime((this.voiceVolume / 64) * 0.5, this.voiceGainNode.context.currentTime);
    this.sourceNode.connect(this.voiceGainNode);
    this.voiceGainNode.connect(this.gainNode);
    this.sourceNode.start(offset);
    
    return this.sourceNode;
  }
  
  portamento(delta: number, duration: number, ticks: number, offset?: number) {
    if(offset == null) offset = this.audioContext.currentTime;
    
    let period = util.noteToPeriod(this.note);
    
    for(let tick = 1; tick <= ticks; ++tick) {
      period += delta;
      this.note = util.periodToNote(period);
      let frequency = util.noteToFramerate(this.note) / this.audioContext.sampleRate;
      
      this.sourceNode.playbackRate.setValueAtTime(frequency,
        offset + (duration / ticks * tick));
    }
  }
  
  /**
   * @param delta Total period delta to apply
   * @param target Target note
   */
  tonePortamento(delta: number, target: number, duration: number, ticks: number, offset?: number) {
    if(offset == null) offset = this.audioContext.currentTime;
    
    if(this.note == target) return;
    
    if(target > this.note && delta > 0 ||
      target < this.note && delta < 0) {
      delta *= -1;
    }
    
    delta /= ticks;
    
    let doBreak = false;
    let period = util.noteToPeriod(this.note);
    
    for(let tick = 1; !doBreak && tick <= ticks; ++tick) {
      period += delta;
      this.note = util.periodToNote(period);
      
      if(isNaN(this.note) ||
        delta > 0 && this.note < target ||
        delta < 0 && this.note > target) {
        this.note = target;
        doBreak = true;
      }
      
      let frequency = util.noteToFramerate(this.note) / this.audioContext.sampleRate;
      
      this.sourceNode.playbackRate.setValueAtTime(frequency,
        offset + (duration / ticks * tick));
    }
  }
  
  vibrato(depth: number, speed: number, duration: number, ticks: number, offset?: number) {
    if(offset == null) offset = this.audioContext.currentTime;
    
    /* doc says (xxxx * ticks) / 64 - seems to be too fast? */
    let mul = (speed * ticks) / 64 / 16;
    
    for(let tick = 1; tick <= ticks; ++tick) {
      let note = this.note + Math.sin(tick / ticks * Math.PI * 2 * mul);
      let frequency = util.noteToFramerate(note) / this.audioContext.sampleRate;
      
      this.sourceNode.playbackRate.setValueAtTime(frequency,
        offset + (duration / ticks * tick));
    }
  }
  
  /*
   * @param delta Semitones per tick
   * @param limit Destination frequency
   */
  // tonePortamento(delta: number, limit: number, duration: number, ticks: number, offset?: number) {
  //   if(offset == null) offset = this.audioContext.currentTime;
    
  //   let doBreak = false;
    
  //   for(let tick = 1; !doBreak && tick <= ticks; ++tick) {
  //     this.frequency = this.frequency * Math.pow(2, delta / 12);
      
  //     if(delta > 0 && this.frequency > limit ||
  //       delta < 0 && this.frequency < limit) {
  //       this.frequency = limit;
  //       doBreak = true;
  //     }
      
  //     this.sourceNode.playbackRate.setValueAtTime(this.frequency,
  //       offset + (duration / ticks * tick));
  //   }
  // }
  
  slideVolumeTo(value: number, duration: number, ticks: number, offset?: number) {
    let delta = (value - this.voiceVolume) / ticks;
    this.slideVolume(delta, duration, ticks, offset);
  }
  
  slideVolume(delta: number, duration: number, ticks: number, offset?: number) {
    if(offset == null) offset = this.audioContext.currentTime;
    
    for(let tick = 1; tick <= ticks; ++tick) {
      this.voiceVolume += delta;
      if(this.voiceVolume < 0) this.voiceVolume = 0;
      else if(this.voiceVolume > 64) this.voiceVolume = 64;
      
      this.voiceGainNode.gain.setValueAtTime((this.voiceVolume / 64) * 0.5,
        offset + (duration / ticks * tick));
    }
    
    this.voiceVolume = Math.round(this.voiceVolume);
  }
}

export class Player {
  channels: Channel[];
  
  activeNodes: AudioBufferSourceNode[];
  
  masterGain: GainNode;
  
  tempo: number;
  
  speed: number; /* ticks per row */
  
  currentPos: number;
  
  currentRow: number;
  
  /**
   * The processed time expressed in seconds.
   * This value is compared to audioContext.currentTime.
   */
  processedTime: number;
  
  interval;
  
  /**
   * This structure stores active information about current rows being
   * nearby current time.
   */
  posRowAtTime;
  
  private audioContext: AudioContext;
  
  private eventListeners = new Map<string, Set<Function>>();
  private eventTimers = new Set<any>();
  
  constructor(private mod: Module) {
    this.audioContext = mod.audioContext;
    this.initialize();
  }
  
  addEventListener(type: string, listener: Function) {
    if(!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set<Function>());
    }
    
    this.eventListeners.get(type).add(listener);
  }
  
  removeEventListener(type: string, listener: Function) {
    if(!this.eventListeners.has(type)) {
      return;
    }
    
    this.eventListeners.get(type).delete(listener);
  }
  
  protected dispatchEvent(type: string, ...args: any[]) {
    if(!this.eventListeners.has(type)) {
      return;
    }
    
    for(let listener of this.eventListeners.get(type)) {
      listener(...args);
    }
  }
  
  protected dispatchTimedEvent(time: number, type: string, ...args: any[]) {
    let delta = time - this.audioContext.currentTime;
    
    if(delta <= 0) {
      this.dispatchEvent(type, ...args);
    } else {
      let id = setTimeout(() => {
        this.eventTimers.delete(id);
        this.dispatchEvent(type, ...args);
      }, delta * 1000);
      
      this.eventTimers.add(id);
    }
  }
  
  private clearTimedEvents() {
    for(let timer of this.eventTimers) {
      clearTimeout(timer);
    }
    
    this.eventTimers.clear();
  }
  
  private initialize() {
    this.activeNodes = [];
    
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.setValueAtTime(1, this.masterGain.context.currentTime);
    // this.masterGain.connect(this.audioContext.destination);
    
    this.channels = [];
    for(let i = 0; i < this.mod.channelCount; ++i) {
      let channel = new Channel(this.audioContext);
      channel.gainNode.connect(this.masterGain);
      this.channels.push(channel);
    }
    
    this.tempo = this.mod.initialTempo;
    this.speed = this.mod.initialSpeed;
    
    this.currentPos = 0;
    this.currentRow = 0;
    
    this.posRowAtTime = [];
  }

  connect(destination: AudioNode) {
    this.masterGain.connect(destination);
  }
  
  start() {
    if(this.isPlaying()) {
      return;
    }
    
    this.processedTime = this.audioContext.currentTime;
    
    /* make sure (every 5000ms) the next 10 seconds are queued */
    this.render(10);
    this.interval = setInterval(() => {
      this.render(10);
    }, 5000);
  }
  
  stop() {
    if(!this.isPlaying()) {
      return;
    }
    
    this.clearTimedEvents();
    
    if(this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    console.log(`${this.activeNodes.length} nodes to stop`);
    let n = 0;
    this.activeNodes.forEach(node => {
      ++n;
      node.stop();
      node.disconnect();
    });
    console.log(`${n} node(s) stopped; ${this.activeNodes.length}`);
    
    this.activeNodes = [];
    this.posRowAtTime = [];
  }
  
  isPlaying() {
    return this.interval != null;
  }
  
  private periodToPlaybackRate(period: number, palVersion: boolean = false) {
    return util.periodToFramerate(period, palVersion) / this.audioContext.sampleRate;
  }
  
  private processRow(row: RowData) {
    let delay = 0;
    let timePerRow = (2500 / this.tempo * this.speed) / 1000;
    
    row.cells.forEach((cell, channelIndex) => {
      /* channel, on which this cell shall be played on */
      let channel = this.channels[channelIndex];
      let isSliding = ['MOD:3','XM:3'].indexOf(cell.effectType) != -1;
      
      let frequency = null;
      let note = null;
      if(cell.period) {
        note = util.periodToNote(cell.period);
      }
      
      if(!isSliding && (cell.instrument || cell.period)) {
        // play cell.period of cell.instrument on channel returning channel.sourceNode
        let sourceNode = channel.playInstrument(cell.instrument, note,
          this.processedTime);
        
        if(sourceNode) {
          sourceNode.onended = (event) => {
            this.activeNodes.splice(
              this.activeNodes.indexOf(<AudioBufferSourceNode>event.target), 1);
          };
          this.activeNodes.push(sourceNode);
        }
      }
      
      switch(cell.effectType) {
        case null: break;
        // case 'MOD:1': // Portamento Up
        //   let currentFreq = channel.frequency;
        //   let destFreq = currentFreq * Math.pow(2, cell.effectValue / 12);
          
        //   channel.slideFrequencyTo(destFreq, timePerRow, this.speed, this.processedTime);
        //   break;
        // case 'MOD:2': // Portamento Down
        //   let currentFreq = channel.frequency;
        //   let destFreq = currentFreq * Math.pow(2, -cell.effectValue / 12);

        //   channel.slideFrequencyTo(destFreq, timePerRow, this.speed, this.processedTime);
        //   break;
        // case 'MOD:3': case 'XM:3': // Tone Portamento
        //   if(!frequency) break;
          
        //   let currentFreq = channel.frequency;
        //   let destFreq = <number>frequency;
        //   let delta = 0;
          
        //   if(destFreq < currentFreq) delta = -cell.effectValue / this.speed;
        //   else if(destFreq > currentFreq) delta = cell.effectValue / this.speed;
        //   else break;
          
        //   channel.tonePortamento(delta, destFreq, timePerRow, this.speed, this.processedTime);
        //   break;
        case 'MOD:1': case 'XM:1': // Portamento Up
          channel.portamento(-cell.effectValue, timePerRow, this.speed, this.processedTime);
          break;
        case 'MOD:2': case 'XM:2': // Portamento Down
          channel.portamento(cell.effectValue, timePerRow, this.speed, this.processedTime);
          break;
        case 'MOD:3': case 'XM:3': // Tone Portamento
          if(note || channel.targetNote || channel.note) {
            channel.targetNote = note || channel.targetNote || channel.note;
            channel.tonePortamento(cell.effectValue, channel.targetNote,
              timePerRow, this.speed, this.processedTime);
          }
          
          break;
        case 'MOD:4': case 'XM:4': // Vibrato
          channel.vibrato(cell.effectValueY, cell.effectValueX, timePerRow, this.speed, this.processedTime);
          break;
        case 'MOD:A': case 'XM:A': // Volume Slide
          if(!channel.voiceGainNode) break;
          let delta = 0;
          if((cell.effectValue & 0xF) && (cell.effectValue & 0xF0) ||
            !cell.effectValue) break;
          
          if(cell.effectValue & 0xF) delta = -cell.effectValue;
          else delta = cell.effectValue >> 4;
          
          channel.slideVolume(delta, timePerRow, this.speed, this.processedTime);
          break;
        case 'MOD:B': case 'XM:B': // Position Jump
          this.currentPos = cell.effectValue; this.currentRow = -1; break;
        case 'MOD:C': case 'XM:C': // Set Volume (of sample)
          if(!channel.voiceGainNode) break;
          let vol = cell.effectValue;
          if(cell.effectValue > 64) cell.effectValue = 64;
          channel.voiceGainNode.gain.setValueAtTime((cell.effectValue / 64) * 0.5,
            this.processedTime);
          break;
        case 'MOD:D': case 'XM:D': // Pattern Break
          ++this.currentPos;
          if(this.currentPos >= this.mod.positionCount) this.currentPos = this.mod.restart;
          this.currentRow = cell.effectValue - 1;
          break;
        case 'MOD:E': case 'XM:E':
          switch (cell.effectValueX) {
            case 0xB: // Fine Volume Slide Down
              if(!channel.voiceGainNode) break;
              let delta = 0;
              
              delta = -cell.effectValueY;
              delta /= this.speed;
              
              channel.slideVolume(delta, timePerRow, this.speed, this.processedTime);
              break;
            case 0xC: // Cut Sample
              if(!channel.voiceGainNode) break;
              //if(channel.effectValue >= this.speed) break;
              channel.voiceGainNode.gain.setValueAtTime(0,
                this.processedTime + (2500 / this.tempo * cell.effectValueY) / 1000);
              break;
            case 0xE: // Delay Pattern
              delay = cell.effectValueY;
              break;
            default:
              console.log('Unknown 0xE effect ' + cell.effectValueX.toString(16).toUpperCase());
          }
          break;
        case 'MOD:F': case 'XM:F': // Set Speed / Set Tempo
          if(cell.effectValue <= 0x20) this.speed = cell.effectValue;
          else this.tempo = cell.effectValue;
          break;
        default:
          console.log('Unknown effect ' + cell.effectType);
      }
    });
    
    return delay;
  }
  
  /**
   * Render the specified amount of seconds, i.e. push nodes to the audio
   * context to be played at specific times.
   *
   * @note It should have no effect when calling this function with the same
   *   length value in the same time (i.e. without a delay). It only ensures
   *   that the desired amount of seconds from now on are in the audio queue.
   *
   * @param length Number of seconds to render
   */
  private render(length: number) {
    if(length <= 0) {
      throw new Error('length must be greater than 0.');
    }
    
    /* remove past entries from posRowAtTime */
    for(let t in this.posRowAtTime) {
      // todo: keep active entry
      let i = this.posRowAtTime.length - 1;
      
      while(this.posRowAtTime[i].time > this.audioContext.currentTime && i > 0) --i;
      if(i > 0) this.posRowAtTime.splice(0, i);
    }
    
    /* process data until audioContext.currentTime + length is reached */
    while(this.processedTime < this.audioContext.currentTime + length) {
      this.dispatchEvent('row.render');
      
      let pattern = this.mod.patterns[this.mod.patternTable[this.currentPos]];
      let row = pattern.rows[this.currentRow];
      this.posRowAtTime.push({
        time: this.processedTime,
        position: this.currentPos, row: this.currentRow,
        speed: this.speed, tempo: this.tempo
      });
      
      let delay = this.processRow(row);
      let eventTime = this.processedTime;
      
      this.processedTime += (2500 / this.tempo * this.speed) / 1000;
      if(delay) this.processedTime += delay * (2500 / this.tempo * this.speed) / 1000;
      
      ++this.currentRow;
      if(this.currentRow >= pattern.rows.length) {
        this.currentRow = 0;
        ++this.currentPos;
        if(this.currentPos >= this.mod.positionCount) this.currentPos = this.mod.restart;
        
        this.dispatchTimedEvent(eventTime, 'position.play');
      }
      
      this.dispatchTimedEvent(eventTime, 'row.play');
    }
  }
}
