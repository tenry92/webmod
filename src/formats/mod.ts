module WebMod {
  export class ModLoader extends Loader {
    static isMod(f: Util.DataReader) {
      return true; // fallback
    }
    
    private convertSamplesToInstruments() {
      this.mod.instruments = [];
      
      this.mod.samples.forEach(sample => {
        var instrument = new Instrument(sample.id);
        
        instrument.name = sample.name;
        instrument.defaultSample = sample;
        
        this.mod.instruments.push(instrument);
      });
    }
    
    private loadSamplesMeta(f: Util.DataReader, nSamples: number) {
      for(var i = 0; i < nSamples; ++i) {
        var sample = new Sample(i + 1);
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
    
    private readPatternTable(f: Util.DataReader) {
      var nPatterns = 0;
      
      /* MOD file has 128 positions */
      for(var i = 0; i < 128; ++i) {
        var index = f.read('u8');
        if(index + 1 > nPatterns) nPatterns = index + 1;
        this.mod.patternTable.push(index);
      }
      
      return nPatterns;
    }
    
    private readPatterns(f: Util.DataReader, nPatterns: number) {
      for(var i = 0; i < nPatterns; ++i) {
        var pattern = new PatternData();
        
        /* each pattern in MOD has 64 rows */
        for(var j = 0; j < 64; ++j) {
          var row = new RowData();
          
          for(var k = 0; k < this.mod.channelCount; ++k) {
            var cell = new CellData();
            
            var d = f.read('u32');
            
            /* 1-based sample id */
            var sampleId = ((d >> 12) & 0xF) | ((d >> 24) & 0xF0);
            
            if(sampleId > 0) {
              if(sampleId > this.mod.instruments.length) {
                throw new Error(`Invalid sample id ${sampleId}.`);
              }
              
              cell.instrument = this.mod.instruments[sampleId - 1];
            }
            
            cell.period = ((d >> 16) & 0xFFF);
            
            var effect = ((d >> 8) & 0xF);
            if(effect) {
              cell.effectType = 'MOD:' + effect.toString(16).toUpperCase();
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
    }
    
    private readSamplesData(f: Util.DataReader) {
      /* extend samples with actual data (buffers) */
      this.mod.samples.forEach(sample => {
        if(sample.length > 0) {
          sample.buffer = this.mod.audioContext.createBuffer(1, sample.length,
            this.mod.audioContext.sampleRate);
          var buffer = sample.buffer.getChannelData(0);
          
          for(var j = 0; j < sample.length; ++j) {
            var level = f.read('s8');
            buffer[j] = level / 128;
          }
        }
      });
    }
    
    load(f: Util.DataReader) {
      this.mod.channelCount = 4;
      var nSamples = 15;
      
      f.seek(0x438);
      
      var formatTag = f.readString(4);
      f.seek(0);
      
      var match = /^(?:M.K.|M!K!|([1-9])CHN|OCTA|FLT([48]))$/g.exec(formatTag);
      if(match) {
        nSamples = 31;
        
        if(match[1]) this.mod.channelCount = parseInt(match[1], 10);
        else if(match[2]) this.mod.channelCount = parseInt(match[2], 10);
      }
      else {
        formatTag = null;
      }
      
      this.mod.name = f.readString(20);
      this.loadSamplesMeta(f, nSamples);
      this.mod.positionCount = f.read('u8');
      this.mod.restart = f.read('u8');
      if(this.mod.restart >= this.mod.positionCount) this.mod.restart = 0;
      
      var nPatterns = this.readPatternTable(f);
      
      if(formatTag) {
        f.read('uint32'); // skip MOD format tag
      }
      
      this.readPatterns(f, nPatterns);
      this.readSamplesData(f);
      
      this.mod.initialTempo = 125;
      this.mod.initialSpeed = 6;
    }
  }
}