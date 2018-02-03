export function periodToFramerate(period: number, palVersion: boolean=false) {
  if(palVersion) return (7093789.2 / (period * 2));
  return (7159090.5 / (period * 2));
}

/**
 * @param note 1..96, where 1 = C-1 and 96 = B-8
 */
export function noteToFramerate(note: number, palVersion: boolean=false) {
  let period = 480 * Math.pow(2, (47 - note) / 12);
  return periodToFramerate(period);
}

export function noteToPeriod(note: number) {
  return 480 * Math.pow(2, (47 - note) / 12);
}

export function periodToNote(period: number) {
  return Math.round(47 - Math.log(period / 480) / Math.LN2 * 12);
}

export class DataReader {
  private offset: number = 0;
  private dataView: DataView;
  
  public littleEndian: boolean;
  
  constructor(data: ArrayBuffer) {
    this.dataView = new DataView(data);
  }
  
  seek(offset: number) {
    this.offset = offset;
  }
  
  skip(n: number) {
    this.offset += n;
  }
  
  tell() {
    return this.offset;
  }
  
  read(type: string, littleEndian?: boolean, peek: boolean=false) {
    if(littleEndian == null) littleEndian = this.littleEndian;
    
    let value: number;
    let length: number;
    
    switch(type.toLowerCase()) {
      default: case 'byte': case 'uint8': case 'uint8_t': case 'u8':
        length = 1;
        value = this.dataView.getUint8(this.offset);
        break;
      case 'int8': case 'int8_t': case 's8':
        length = 1;
        value = this.dataView.getInt8(this.offset);
        break;
      case 'uint16': case 'uint16_t': case 'u16':
        length = 2;
        value = this.dataView.getUint16(this.offset, littleEndian);
        break;
      case 'int16': case 'int16_t': case 's16':
        length = 2;
        value = this.dataView.getInt16(this.offset, littleEndian);
        break;
      case 'uint32': case 'uint32_t': case 'u32':
        length = 4;
        value = this.dataView.getUint32(this.offset, littleEndian);
        break;
      case 'int32': case 'int32_t': case 's32':
        length = 4;
        value = this.dataView.getInt32(this.offset, littleEndian);
        break;
    }
    
    if(!peek) this.offset += length;
    return value;
  }
  
  readChar(peek: boolean=false) {
    let value: string = '';
    
    let c = this.dataView.getUint8(this.offset);
    if(c) value = String.fromCharCode(c);
    
    if(!peek) ++this.offset;
    
    return value;
  }
  
  readString(length: number) {
    let value = '';
    for(let i = 0; i < length; ++i) value += this.readChar();
    
    return value;
  }
  
  peek(type: string, littleEndian?: boolean) {
    return this.read(type, littleEndian, true);
  }
  
  peekChar() {
    return this.readChar(true);
  }
  
  rewind() {
    this.offset = 0;
  }
}
