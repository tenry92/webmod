module WebMod {
  export class XmLoader extends Loader {
    name: string = '';
    
    static isXm(f: Util.DataReader) {
      f.seek(0);
      var xmId = 'extended module: ';
      var format = f.readString(xmId.length);
      f.rewind();
      
      return format.toLowerCase() == xmId;
    }
    
    load(f: Util.DataReader) {
      //throw new Error('XM format not implemented.');
      
      f.littleEndian = true;
      f.seek(0x11); // skip 'extended module: '
      
      this.mod.name = f.readString(20);
      
      var stripped;
      switch(f.read('u8')) {
        case 0x00: stripped = true; break;
        case 0x1A: stripped = false; break;
        default: throw new Error('Invalid format.');
      }
      
      var trackerName = f.readString(20);
      var version = f.read('u16'); // should be 0x0103
      
      var headerSize = f.read('u32');
      /*if(headerSize != 0x0114) {
        throw new Error('headerSize must be 0x0114.');
      }*/
      //f.skip(2); // ???
      
      this.mod.positionCount = f.read('u16');
      this.mod.restart = f.read('u16');
      this.mod.channelCount = f.read('u16');
      
      var nPatterns = f.read('u16');
      var nInstruments = f.read('u16');
      
      var flags = f.read('u16');
      var freqTable = (flags & 0x1) ? 'linear' : 'amiga';
      
      this.mod.initialSpeed = f.read('u16'); // referred as 'tempo' in XM spec
      this.mod.initialTempo = f.read('u16'); // referred as 'BPM' in XM spec
      
      for(var i = 0; i < 256; ++i) {
        this.mod.patternTable.push(f.read('u8'));
      }
      
      
      f.seek(headerSize + 60);
      
      this.mod.instruments = [];
      
      for(var i = 0; i < nPatterns; ++i) {
        var patternHeaderLength = f.read('u32');
        var packingType = f.read('u8');
        
        if(packingType != 0) {
          throw new Error('packingType must be 0.');
        }
        
        var nRows = f.read('u16'); // 1..256
        if(nRows < 1 || nRows > 256) {
          throw new Error('Pattern must have 1..256 rows.');
        }
        
        var patternPackedSize = f.read('u16');
        // if this is 0, all rows are empty, no data is
        // found for this pattern in the file
        
        var pattern = new PatternData();
        
        // allocate empty pattern
        for(var j = 0; j < nRows; ++j) {
          var row = new RowData();
          for(var k = 0; k < this.mod.channelCount; ++k) {
            var cell = new CellData();
            cell.note = 0;
            cell.instrument = null;
            cell.volume = 0;
            cell.effectType = null;
            cell.effectParam = 0;
            
            row.cells.push(cell);
          }
          
          pattern.rows.push(row);
        }
        
        
        var currentRow = 0;
        var currentChannel = 0;
        while(true) {
          var cell = pattern.rows[currentRow].cells[currentChannel];
          
          var flags = f.read('u8');
          if(!(flags & 0x80)) { // no packaging applied
            cell.note = flags; // flags is actually the note value
            flags = 0x9E; // instrument, volume and effect coming
          }
          if(flags & 0x80) { // packaging applied
            if(flags & 0x1) {
              cell.note = f.read('u8');
            }
            if(flags & 0x2) {
              var instrumentId = f.read('u8');
              while(instrumentId > this.mod.instruments.length) {
                var id = this.mod.instruments.length + 1;
                var instrument = new Instrument(id);
                this.mod.instruments.push(instrument);
              }
              cell.instrument = this.mod.instruments[instrumentId - 1];
            }
            if(flags & 0x4) cell.volume = f.read('u8');
            if(flags & 0x8) {
              var type = f.read('u8');
              if(type <= 0xF) {
                cell.effectType = 'XM:' + type.toString(16).toUpperCase();
              }
              else {
                cell.effectType = 'XM:' + String.fromCharCode('F'.charCodeAt(0) + type - 0xF);
              }
              
              cell.effectValue = 0; // default
            }
            if(flags & 0x10) {
              cell.effectValue = f.read('u8');
            }
          }
          
          if(cell.note > 0 && cell.note < 97) {
            // assuming linear freq table for now
            //cell.period = 10 * 12 * 16 * 4 - cell.note * 16 * 4;
            cell.period = 480 * Math.pow(2, (47 - cell.note) / 12);
          }
          else if(cell.note == 97) {
            // note off; not yet implemented
          }
          
          if(++currentChannel >= this.mod.channelCount) {
            currentChannel = 0;
            if(++currentRow >= nRows) {
              currentRow = 0;
              break;
            }
          }
        }
        
        this.mod.patterns.push(pattern);
      }
      
      var nextInstrumentOffset;
      for(var i = 0; i < nInstruments; ++i) {
        var instrument: Instrument;
        var keymap = [];
        if(i < this.mod.instruments.length) {
          instrument = this.mod.instruments[i];
        }
        else {
          instrument = new Instrument(i + 1);
        }
        
        if(nextInstrumentOffset) f.seek(nextInstrumentOffset);
        var instrumentHeaderSize = f.read('u32');
        nextInstrumentOffset = f.tell() - 4 + instrumentHeaderSize;
        
        instrument.name = f.readString(22);
        var type = f.read('u8');
        if(type != 0) {
          //throw new Error('Instrument type must be 0.');
        }
        
        var nSamples = f.read('u16');
        
        if(nSamples > 0) {
          nextInstrumentOffset = null;
          
          // additional instrument info only if samples are available
          var sampleHeaderSize = f.read('u32');
          for(var j = 0; j < 96; ++j) {
            keymap.push(1 + f.read('u8') + this.mod.samples.length); // 1-based sample index
          }
          
          for(var j = 0; j < 24; ++j) {
            instrument.volumeEnvelope.push(f.read('u16'));
          }
          for(var j = 0; j < 24; ++j) {
            instrument.panningEnvelope.push(f.read('u16'));
          }
          
          instrument.volumeEnvelope.splice(f.read('u8'));
          instrument.panningEnvelope.splice(f.read('u8'));
          
          instrument.volumeSustainPoint = f.read('u8');
          instrument.volumeLoopStart = f.read('u8');
          instrument.volumeLoopEnd = f.read('u8');
          
          instrument.panningSustainPoint = f.read('u8');
          instrument.panningLoopStart = f.read('u8');
          instrument.panningLoopEnd = f.read('u8');
          
          var volType = f.read('u8'); // bit 0: on; bit 1: sustain; bit 2: loop
          var panType = f.read('u8'); // same
          
          var vibratoType = f.read('u8');
          var vibratoSweep = f.read('u8');
          var vibratoDepth = f.read('u8');
          var vibratoRate = f.read('u8');
          var volumeFadeout = f.read('u16');
          f.skip(22);
          
          
          for(var j = 0; j < nSamples; ++j) {
            var sample = new Sample(this.mod.samples.length + 1);
            var dataLength = f.read('u32'); // length of data in bytes
            sample.repeat = f.read('u32');
            sample.repeatLength = f.read('u32');
            sample.volume = f.read('u8');
            sample.finetune = f.read('s8'); // -128..127
            var loopType = f.read('u8'); // 0 = off, 1 = normal, 2 = bidi; bit 4: 8/16-bit sample data
            sample.panning = f.read('u8'); // 0..255
            var relativeNoteNumber = f.read('s8');
            sample.finetune += relativeNoteNumber * 128; 8;
            f.skip(1); // reserved
            sample.name = f.readString(22);
            
            var frameSize = (loopType & 0x8) ? 's16' : 's8';
            if(frameSize == 's16') sample.length = Math.floor(dataLength / 2); // 16-bit
            else sample.length = dataLength; // 8-bit
            
            if(sample.length > 0) {
              sample.buffer = this.mod.audioContext.createBuffer(1, sample.length,
                this.mod.audioContext.sampleRate);
              var buf = sample.buffer.getChannelData(0);
              
              /*var level = 0;
              var lowPeak = 0;
              var highPeak = 0;
              for(var k = 0; k < sample.length; ++k) {
                if(frameSize == 's16') level += f.read('s16') / 0x8000;
                else level += f.read('s8') / 0x80;
                buf[k] = level;
                
                if(level < lowPeak) lowPeak = level;
                else if(level > highPeak) highPeak = level;
              }
              
              if(lowPeak >= -1 && highPeak <= 1) {
                console.info(sample.id, lowPeak, highPeak);
              }
              else {
                console.warn(sample.id, lowPeak, highPeak);
              }*/
              
              var level = 0;
              for(var k = 0; k < sample.length; ++k) {
                if(frameSize == 's16') {
                  level += f.read('s16');
                  if(level > 0x7FFF) level -= 0xFFFF;
                  else if(level < -0x8000) level += 0xFFFF;
                  buf[k] = (level + 0x8000) / 0xFFFF * 2 - 1;
                }
                else {
                  level += f.read('s8');
                  if(level > 0x7F) level -= 0xFF;
                  else if(level < -0x80) level += 0xFF;
                  buf[k] = (level + 0x80) / 0xFF * 2 - 1;
                }
              }
            }
            this.mod.samples.push(sample);
          }
        }
        
        keymap.forEach(sampleId => {
          if(sampleId > this.mod.samples.length) {
            throw new Error(`Invalid sample id ${sampleId}.`);
          }
          
          var sample = this.mod.samples[sampleId - 1];
          instrument.keymap.push(sample);
        });
        
        if(i >= this.mod.instruments.length) {
          this.mod.instruments.push(instrument);
        }
      }
    }
  }
}