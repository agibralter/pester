(function($) {
  
  var classes = {};
  
  String.prototype.tagToVar = function () {
    return this.replace(/-/g, "_");
  };
  
  // TODO This function is WACK. Works for now though...
  String.prototype.collectionToClass = function () {
    var collection = this.replace(/s$/, '');
    
    var words = collection.split(/-/);
    words = $.map(words, function (ele, i) {
      return ele.substr(0, 1).toUpperCase() + ele.substr(1, ele.length - 1);
    });
    return words.join('');
  };
  
  String.prototype.collectionToVar = function () {
    return this.replace(/-/g, '_');
  };
  
  var parseLeafTag = function (tag) {
    var type = $(tag).attr('type');
    var val;
    switch(type) {
      case 'integer':
        val = $(tag).text() ? parseInt($(tag).text(), 10) : null;
        break;
      case 'boolean':
        val = $(tag).text() ? true : false;
        break;
      default:
        val = $(tag).text();
    }
    return val;
  };
  
  var buildParams = function (params_obj) {
    var params = '';
    $.each(params_obj, function (key, val) {
      params += encodeURI(key) + '=' + encodeURI(val);
    });
    return params;
  };
  
  var defaults = {
    class_methods: {
      New : function (xml) {
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
      find_all: function (callback, params_obj) {
        var $this = this;
        var params;
        if (params_obj) {
          params = buildParams(params_obj);
        }
        
        $.ajax({
          type: "GET",
          url: this.resource_path,
          data: params,
          success: function (data, textStatus) {
            var name = $this.resource_name_xml + 's';
            var results = [];
            if ($(name, data).size() == 1) {
              $(name, data).children().each(function () {
                var instance = $this.New(this);
                results.push(instance);
              });
              if (callback) {
                callback.call(results);
              }
            }
          }
        });
      },
      find: function (id, callback, params_obj, reload) {
        var params;
        if (params_obj) {
          params = buildParams(params_obj);
        }
        if (this.instances[id] && this.instances[id][params] && (reload == undefined || !reload)) {
          if (callback) {
            callback.call(this.instances[id][params]);
          }
        } else {
          var instance = this.New();
          $.ajax({
            type: "GET",
            url: this.url_for(id),
            data: params,
            success: function (data, textStatus) {
              var name = instance.class_obj.resource_name_xml;
              if ($(name, data).size() == 1) {
                instance.parse_xml($(name, data));
              }
              // cache object
              // TODO limit size of cache?
              if (!instance.class_obj.instances[id]) {
                instance.class_obj.instances[id] = {};
              }
              instance.class_obj.instances[id][params] = instance;
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
                collection.push($[model].New(this));
              });
              
              $this[this.tagName.collectionToVar()] = collection;
            } else {
              $this[this.tagName.collectionToVar()] = $[model].New(this);
            }
          } else {
            $this[this.tagName.tagToVar()] = this;
          }
        });
      },
      initialize: function () {
      }
    }
  };
  
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
        if (obj && obj['instance']) {
          $.each(obj['instance'], function (name, method) {
            $this[name] = function () {
              return method.apply($this, arguments);
            };
          });
        }
        this.initialize.call(this);
      };
      
      // THE 'CLASS' object
      var Class = function () {        
        this.resource_name = $.map(name.split(/(?=[A-Z])/), function (ele, i) {
          return ele.toLowerCase();
        }).join('_');
        this.resource_path = this.resource_name + 's';
        this.resource_name_xml = this.resource_name.replace(/_/g, '-');
        this.instances = {};
      };
      
      Class = new Class();
      classes[name] = Class;
      instance.prototype.class_obj = Class;
      Class._instance = instance;
      
      $.each(defaults['class_methods'], function (name, method) {
        Class[name] = function () {
          return method.apply(Class, arguments);
        };
      });
      
      jQueryExtObj[name] = Class;
      
      jQuery.extend(jQueryExtObj);
    }
  });

})(jQuery);
