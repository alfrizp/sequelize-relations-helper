'use strict';

class AssociationHelperPlugin {
  constructor( db, opts ) {
    this._db = db;
    this._opts = opts || {};
    this._models = new Set();
  }

  register( Model ) {
    if( Model.options.relations ) {
      if( this._opts.debug ) {
        console.log(`[AssociationHelperPlugin] Register new model "${Model.name}"`);
      }
      this._models.add( Model );
    }
    this.setup();
  }

  checkOnMissingModel(model) {
    if(!this._db.isDefined(model) 
      && typeof this._opts.onMissingModel === 'function') {
      this._opts.onMissingModel(model);
    }
  }

  log(modelSrc, modelDst, type, opts, isCompleted) {
    if(this._opts.debug) {
      console.log(`[AssociationHelperPlugin] Set "${modelSrc}" ${type} "${modelDst}"` , isCompleted, opts);
    }
  }
  
  setup( ) {
    if( !this._models.size ) {
      return; 
    }
    this._models.forEach( modelSrc  => {
      for( let def of modelSrc.options.relations ) {
        this.checkOnMissingModel(def.target);

        if( !def._complete && this._db.isDefined( def.target ) ) {
          const modelDst = this._db.model(def.target);
          let opts = def.options || def.opts || {};

          switch( def.type ) {
            case 'hasOne':
            case 'belongsTo':
            case 'hasMany':
              this.log(modelSrc.name, modelDst.name, def.type, opts, def._complete);

              def._complete = true;              
              modelSrc[def.type]( modelDst, Object.assign( {}, opts ) );
              break;              
            case 'belongsToMany':
              let throughModel = typeof opts.through === 'string' ? opts.through : opts.through.model;

              this.checkOnMissingModel(throughModel);

              if(!def._complete && this._db.isDefined(throughModel)) {
                this.log(modelSrc.name, modelDst.name, def.type, opts, def._complete);
                
                throughModel = this._db.model(throughModel);
                def._complete = true;
                modelSrc[def.type](modelDst, Object.assign({ through: throughModel }, opts));
              }
              break;
          }
        }
      }
    });
  }
}


module.exports = ( db, opts ) => {
  const plugin = new AssociationHelperPlugin( db, opts );
  db.hook('afterDefine', ( Model ) => {
    plugin.register( Model );
  });
};