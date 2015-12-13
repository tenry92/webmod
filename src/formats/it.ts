module WebMod {
  export class ItLoader extends Loader {
    static isIt(f: Util.DataReader) {
      f.seek(0);
      var format = f.readString(4);
      f.rewind();
      
      return format == 'IMPM';
    }
    
    load(f: Util.DataReader) {
      throw new Error('IT format not implemented.');
    }
  }
}