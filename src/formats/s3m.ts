import * as util from '../util';
import {Loader} from '../loader';
import {PatternData, RowData, CellData, Instrument, Sample} from '../player';

export class S3mLoader extends Loader {
  name: string = '';
  
  static isS3m(f: util.DataReader) {
    f.seek(0x2C);
    let format = f.readString(4);
    f.rewind();
    
    return format == 'SCRM';
  }
  
  load(f: util.DataReader) {
    throw new Error('S3M format not implemented.');
  }
}
