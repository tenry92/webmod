import * as util from '../util';
import {Loader} from '../loader';
import {PatternData, RowData, CellData, Instrument, Sample} from '../player';

export class ModLoader extends Loader {
  static isMod(f: util.DataReader) {
    return true; // fallback
  }
  
  private convertSamplesToInstruments() {
    this.mod.instruments = [];
    
    this.mod.samples.forEach(sample => {
      let instrument = new Instrument(sample.id);
      
      instrument.name = sample.name;
      instrument.defaultSample = sample;
      
      this.mod.instruments.push(instrument);
    });
  }
  
  private loadSamplesMeta(f: util.DataReader, nSamples: number) {
    for(let i = 0; i < nSamples; ++i) {
      let sample = new Sample(i + 1);
      sample.name = f.readString(22);
      sample.length = f.read('u16') << 1;
      sample.finetune = f.read('s8');
      sample.volume = f.read('u8');
      sample.repeat = f.read('u16') << 1;
      sample.repeatLength = f.read('u16') << 1;
      if(sample.repeatLength <= 2) sample.repeatLength = 0;
      
      this.mod.samples.push(sample);
    }
    
    this.convertSamplesToInstruments();
  }
  
  private readPatternTable(f: util.DataReader) {
    let nPatterns = 0;
    
    /* MOD file has 128 positions */
    for(let i = 0; i < 128; ++i) {
      let index = f.read('u8');
      if(index + 1 > nPatterns) nPatterns = index + 1;
      this.mod.patternTable.push(index);
    }
    
    return nPatterns;
  }
  
  private readPatterns(f: util.DataReader, nPatterns: number) {
    let effectsUsed = [];
    
    for(let i = 0; i < nPatterns; ++i) {
      let pattern = new PatternData();
      
      /* each pattern in MOD has 64 rows */
      for(let j = 0; j < 64; ++j) {
        let row = new RowData();
        
        for(let k = 0; k < this.mod.channelCount; ++k) {
          let cell = new CellData();
          
          let d = f.read('u32');
          
          /* 1-based sample id */
          let sampleId = ((d >> 12) & 0xF) | ((d >> 24) & 0xF0);
          
          if(sampleId > 0) {
            if(sampleId > this.mod.instruments.length) {
              throw new Error(`Invalid sample id ${sampleId}.`);
            }
            
            cell.instrument = this.mod.instruments[sampleId - 1];
          }
          
          cell.period = ((d >> 16) & 0xFFF);
          
          let effect = ((d >> 8) & 0xF);
          if(effect) {
            cell.effectType = 'MOD:' + effect.toString(16).toUpperCase();
            if(effectsUsed.indexOf(cell.effectType) == -1) {
              effectsUsed.push(cell.effectType);
            }
          }
          else {
            cell.effectType = null;
          }
          
          cell.effectValue = d & 0xFF;
          
          row.cells.push(cell);
        }
        
        pattern.rows.push(row);
      }
      
      this.mod.patterns.push(pattern);
    }
    
    effectsUsed.sort();
    console.log(effectsUsed.join(', '));
  }
  
  private readSamplesData(f: util.DataReader) {
    /* extend samples with actual data (buffers) */
    this.mod.samples.forEach(sample => {
      if(sample.length > 0) {
        sample.buffer = this.mod.audioContext.createBuffer(1, sample.length,
          this.mod.audioContext.sampleRate);
        let buffer = sample.buffer.getChannelData(0);
        
        for(let j = 0; j < sample.length; ++j) {
          let level = f.read('s8');
          buffer[j] = level / 128;
        }
      }
    });
  }
  
  load(f: util.DataReader) {
    this.mod.format = 'MOD';
    this.mod.channelCount = 4;
    let nSamples = 15;
    
    f.seek(0x438);
    
    let formatTag = f.readString(4);
    f.seek(0);
    
    let match = /^(?:M.K.|M!K!|([1-9])CHN|OCTA|FLT([48]))$/g.exec(formatTag);
    if(match) {
      nSamples = 31;
      
      if(match[1]) this.mod.channelCount = parseInt(match[1], 10);
      else if(match[2]) this.mod.channelCount = parseInt(match[2], 10);
      
      this.mod.subFormat = formatTag;
    } else {
      formatTag = null;
      this.mod.subFormat = '';
    }
    
    this.mod.name = f.readString(20);
    this.loadSamplesMeta(f, nSamples);
    this.mod.positionCount = f.read('u8');
    this.mod.restart = f.read('u8');
    if(this.mod.restart >= this.mod.positionCount) this.mod.restart = 0;
    
    let nPatterns = this.readPatternTable(f);
    
    if(formatTag) {
      f.read('uint32'); // skip MOD format tag
    }
    
    this.readPatterns(f, nPatterns);
    this.readSamplesData(f);
    
    this.mod.initialTempo = 125;
    this.mod.initialSpeed = 6;
  }
}
