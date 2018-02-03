import * as util from './util';
import {Module} from './webmod';

export abstract class Loader {
  constructor(protected mod: Module) {
    
  }
  
  abstract load(f: util.DataReader);
}
