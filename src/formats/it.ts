import * as util from '../util';
import {Loader} from '../loader';
import {PatternData, RowData, CellData, Instrument, Sample} from '../player';

export class ItLoader extends Loader {
  static isIt(f: util.DataReader) {
    f.seek(0);
    let format = f.readString(4);
    f.rewind();
    
    return format == 'IMPM';
  }
  
  load(f: util.DataReader) {
    throw new Error('IT format not implemented.');
  }
}
