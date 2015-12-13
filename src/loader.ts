module WebMod {
  export abstract class Loader {
    constructor(protected mod: Module) {
      
    }
    
    abstract load(f: Util.DataReader);
  }
}