(function($) {
  
  var classes = {};
  
  String.prototype.tagToVar = function () {
    return this.replace(/-/g, "_");
  }
  
  // TODO This function is WACK. Works for now though...
  String.prototype.collectionToClass = function () {
    var collection = this.replace(/s$/, '');
    
    var words = collection.split(/-/);
    words = $.map(words, function (ele, i) {
      return ele.substr(0, 1).toUpperCase() + ele.substr(1, ele.length - 1);
    });
    return words.join('');
  }
  
  String.prototype.collectionToVar = function () {
    return this.replace('-', '_');
  }
  
  var parseLeafTag = function (tag) {
    var type = $(tag).attr('type');
    var val;
    switch(type) {
      case 'integer':
        val = parseInt($(tag).text());
        break
      case 'boolean':
        val = $(tag).text() ? true : false;
        break;
      default:
        val = $(tag).text();
    }
    return val;
  }
  
  var defaults = {
    class: {
      new: function (xml) {
        var instance = new this._instance();
        if (xml) {
          instance.parse_xml(xml);
        }
        return instance;
      },
      url_for: function (id) {
        if (this._url) {
          return this._url;
        } else {
          return (this.resource_path + '/' + id);
        }
      },
      url: function (url) {
        if (url) {
          this._url = url;
        }
        return this._url;
      },
      find: function (id, callback, reload) {
        var instance = this.new();
        
        if (instance.class.instances[id] && (reload != undefined || !reload)) {
          if (callback) {
            callback.call(instance);
          }
        } else {
          $.ajax({
            type: "GET",
            url: this.url_for(id),
            success: function (data, textStatus) {
              var name = instance.class.resource_name_xml;
              if ($(name, data).size() == 1) {
                instance.parse_xml($(name, data));
              }
              // cache object
              // TODO limit size of cache?
              instance.class.instances[id] = instance;
              if (callback) {
                callback.call(instance);
              }
            }
          });
        }
      }
    },
    instance: {
      parse_xml: function (xml) {
        var $this = this;
        
        // Parse leaf nodes
        $(xml).children().filter(function () {
          return $(this).children().length == 0;
        }).each(function () {
          $this[this.tagName.tagToVar()] = parseLeafTag(this);
        });
        
        // Parse sub-models
        $(xml).children().filter(function () {
          return $(this).children().length > 0;
        }).each(function () {
          
          // Check for model defition
          var model = this.tagName.collectionToClass();

          if ($[model]) {

            // Check to see if this is a has_one or has_many
            var children = $(this).children().filter(function () {
              return (this.tagName.collectionToClass() == model);
            });
            
            if (children.size() > 0) {
              // make array of models
              var collection = [];
              $(children).each(function () {
                collection.push($[model].new(this));
              });
              
              $this[this.tagName.collectionToVar()] = collection;
            } else {
              $this[this.tagName.collectionToVar()] = $[model].new(this);
            }
          } else {
            $this[this.tagName.tagToVar()] = this;
          }
        });
      },
      initialize: function () {
      }
    }
  }
  
  jQuery.extend({
    define_model: function (name, obj) {
      var jQueryExtObj = {};
      
      // THE 'INSTACE' object
      var instance = function () {
        var $this = this;
        $.each(defaults['instance'], function (name, method) {
          $this[name] = function () {
            return method.apply($this, arguments);
          };
        });
        this.initialize.call(this);
      };
      
      // THE 'CLASS' object
      var class = function () {        
        this.resource_name = $.map(name.split(/(?=[A-Z])/), function (ele, i) {
          return ele.toLowerCase();
        }).join('_');
        this.resource_path = this.resource_name + 's';
        this.resource_name_xml = this.resource_name.replace('_', '-');
        this.instances = {};
      };
      
      class = new class();
      classes[name] = class;
      instance.prototype.class = class;
      class._instance = instance;
      
      $.each(defaults['class'], function (name, method) {
        class[name] = function () {
          return method.apply(class, arguments);
        }
      });
      
      jQueryExtObj[name] = class;
      
      jQuery.extend(jQueryExtObj);
    }
  });

})(jQuery);
