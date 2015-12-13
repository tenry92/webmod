module WebMod {
  export class S3mLoader extends Loader {
    name: string = '';
    
    static isS3m(f: Util.DataReader) {
      f.seek(0x2C);
      var format = f.readString(4);
      f.rewind();
      
      return format == 'SCRM';
    }
    
    load(f: Util.DataReader) {
      throw new Error('S3M format not implemented.');
    }
  }
}