/**
 * FormValidator  
 * The jQuery plugin to validate form fields.
 * https://github.com/atrost/formvalidator
 * Inspired by formavalidation.io.    
 *
 * @author      https://github.com/atrost
 * @copyright   (c) 2014 - 2016 Arie Trost
 * 
 */

(function($){
    /* NAMESPACE
     * ==================== */
    if(!$.msp){
        $.msp = new Object();
    };
    
    /* FORMVALIDATOR CONSTRUCTOR
     * ========================= */
 
    $.msp.formvalidator = function(el, options){
        // To avoid scope issues, use 'base' instead of 'this'
        // to reference this class from internal events and functions.
        var base = this;
        // Access to DOM 
        base.el = el;
        base.$el = $(el);
        // namespace
        base.namespace = "msp";
        // Add a reverse reference to the DOM object
        base.$el.data("msp.formvalidator", base);
        
        // Initializer - setup the Prototype
        base.init = function(){
            base.options = $.extend({},$.msp.formvalidator.defaultOptions, options);
            
            // Initialization
            initFields();
            initForm();
            setupValidation();
        };
        
        // Private Functions 
        function initFields(tab) {  
            var that = base;
            var root = tab && tab.length > 0 ? tab : base.$el;
            root.find(':input[required=""], :input[required]', ':select[required] ,:select[required=""], :textarea[required]').each(function() {  
                var field = $(this),
                    trigger = getTrigger(field), 
                    events = $.map(trigger, function(item) {
                        return 'input'+'.'+item+'.'+base.namespace+'  '+'change'+'.'+item+'.'+base.namespace;
                    }).join(' '); 
                $(field).off(events).on(events, function(evt) {
                    $(this).trigger($.Event(base.options.events.fieldStatus), {
                       field: this,
                       validator: base,
                       element: $(this)
                    });
                });
            });
        }

        function getTrigger(f) {
            return [f.context.localName];
        }

        function initForm() {  
            var that = base;
            that.validatedTabs = {};
            base.$el.find(':input[required=""], :input[required]', ':select[required] ,:select[required=""], :textarea[required]').each(function() {  
               that.validateTabContainer($(this));
            });          
            return that;
        }

        function setupValidation(tab) {
            var form = base.$el;
            var root = tab && tab.length > 0 ? tab : form;
            $('input[required],select[required],input[required=""],select[required=""], textarea[required]',root)         
                .on("change", function(event) {
                    var target = event.currentTarget;
                    if (!target.selectedIndex || target.selectedIndex < 0 ) return;
                    var selected_value = target.options[target.selectedIndex].value;
                    if(!_.isEmpty(selected_value)) {
                        $(target).find("option").each(function(opt) {
                            if(_.isEmpty($(this).val())) {
                                $(this).remove();
                            }
                        });
                    }
                }) 
                .mouseover(function(e){
                   var field = $(this);
                   field.tooltip('destroy');
                   e.stopImmediatePropagation();                  
                })
                .on("blur", function() {
                    var field = $( this );
                    if (field.data("tooltip") ) {                        
                        if (this.validity.valid) {
                            field.tooltip("destroy");
                        } else {
                            field.tooltip("hide");
                        }
                    }
                })

                .on("focus", function() {
                    var field = $(this);
                    if (field.data("tooltip") ) {
                        field.tooltip("show");
                    }
                });

            // If inline form within a table make the table the root node  
            root = form[0].parentNode.tagName.toLowerCase() == "td" ? form.parents().find('table') : root;

            jQuery("button[type=submit],input[type=submit]",root).add("[class*='submit']",root).off("click").on( "click", function(event) {  
                $("input,select",form).each( function(e) {
                    var field = $(this);
                    if (field.data("tooltip")) {
                        field.tooltip("destroy");
                    }
                });
            
                var fieldsInvalid = $("input:invalid:not([class*='hidden']), textarea:invalid:not([class*='hidden']), select:invalid:not([class*='hidden'])",form).each(function() {
                    var field = $(this);
                    field.tooltip({
                        title: function() {
                            /* 'Please fill out this field' + | Constrain-specific error | */
                            var validationMessage = field[0].validationMessage;

                            if (this.validity.valueMissing) {
                              return validationMessage;
                            }

                            return !_.isEmpty(field.attr('pattern_title'))
                              ? validationMessage + ' ' + field.attr('pattern_title')
                              : validationMessage;
                        }
                    });
                    $(this).attr('data-original-title',"");
  
                });
                
                // Insures tab validation for dynamically added content [UOM-1182] 
                base.validateTabContainer('alltabs'); 
                
                if (fieldsInvalid && fieldsInvalid.length > 0) {
                    // UOM-1350/51 udapted to enable "tab-through" navigation
                    if ($(event.target).prop("type") === "submit") { 
                        fieldsInvalid.first().trigger("focus").eq(0).focus();
                        event.stopImmediatePropagation(); 
                    } else 
                    if ($(event.target).attr("data-next-tab") && fieldsInvalid.is(':visible') === true ) {
                        fieldsInvalid = $.grep(fieldsInvalid, function(el){ return $(el).is(':visible') }) 
                        if (fieldsInvalid && fieldsInvalid.length) {
                            $(fieldsInvalid[0]).trigger("focus").eq(0).focus();
                            event.stopImmediatePropagation(); 
                        }     
                    }   
                     // else, let the underlying form to handle button click actions (e.g., navigate through tabs) 
                }
            });


            if (tab) return base;

            // Browsers, e.g., Safari that submit on error 
            //
            // if (_gUserAgent.is == 'safari')
            //  this.preventSubmit
            //
            $(form).on("submit",function(event) {
                if (!this.checkValidity()) {
                    event.preventDefault();
                }
            });

            base.el.addEventListener("invalid", function(event) {
                event.preventDefault();
            }, true );


            form.trigger($.Event(base.options.events.formInit), {
                validator: base,
                element: $(this)
            });

            return base;

        } 

        function initTabValidation (tab) {      
            initFields.call(this, tab);
            setupValidation.call(this, tab);
            return this;
        }

        // ///////////////////////////////////////////////////////////////
        // Public Functions 
        // ///////////////////////////////////////////////////////////////  
        /**
         * Tabbed-form validation 
         * A method checks if all "required" fields of a given tab are valid.  
         * Currently the method validates only based on the HTML5 'required' attribute.  
         * 
         * @param {String|jQuery} container The tab container selector or element
         * @returns {Boolean}
         */
        base.isValidTabContainer = function (tabContainer) {

            var that       = this,
                map        = {},
                $tabcontainer = ('string' === typeof tabContainer) ? $(tabContainer) : tabContainer;
            if ($tabcontainer.length === 0) {
                return true;
            }

            var ret = true;
            $tabcontainer.find(':input[required=""], :input[required]', ':select[required] ,:select[required=""]', ':textarea[required], :textarea[required=""]').each(function(i) {
                var $field = $(this);
                if (!$field.context.checkValidity()) {
                    ret =false; 
                    return false;
                }
            });
            return ret;
        }

        /**
         * Tabbed-form live validation 
         * A method checks if the given field is an element of a tab container and if it is
         * it attempts to validate the container - it will apply the appropriate valid/invalid classes
         * to the tab's header based on the validity of all of the tab's fields. 
         * If the given field does not belong to a container or the parent tab container cannot be 
         * identified (e.g., based on the href property) the function simply exists.
         * The method can also be passed a tab element or a string. If a tab element is passed
         * the method will attempt to validate only that particular tab. If passed a string, it 
         * should determine a form-wise specific action to be performed.  
         *
         * @param {String|jQuery} fieldOrTab The field or tab element
         * @returns {Boolean}
         */
        base.validateTabContainer = function (fieldOrTab) {
           
           var field = fieldOrTab;
           if (!field) return;
           if (typeof field === 'string') {
               initTabValidation.call(base);
               var that = this;
               base.$el.find(':input[required=""], :input[required]', ':select[required] ,:select[required=""]').each(function() {  
                   that.validateTabContainer($(this));
            });
           }
           
           if (typeof field !== 'object') return;
           var tag = field.tagName ? field.tagName.toLowerCase() : field[0].tagName.toLowerCase();
           if (tag !== 'input' && tag !== 'select' && tag !== 'textarea') {
             var tab = field; 
             if (!tab.attr('id') || tab.attr('id') =='') return;
             this.validatedTabs[tab.attr('id')] = false;
             var that = this;
             initTabValidation.call(base,tab);
             $(tab).find(':input[required=""], :input[required]', ':select[required] ,:select[required=""]').each(function() {  
               that.validateTabContainer($(this));
            });
           } 

           var parentTab =  $(field).is('.tab-pane') ? field : $(field).parents('.tab-pane');
           if (!(!parentTab || parentTab && parentTab.length > 0)) return;

           var tabId = parentTab.attr('id');
           if (!tabId) return; 
          
           // lookup
           var tabHeader = $(field).parents().find('a[href="#' + tabId + '"]')
           if (!tabHeader && tabHeader.length > 0) return;  

            var state = this.isValidTabContainer(parentTab);

           if (!state) {
             // invalid
             this.setTabHeaderState(tabHeader,state);
             this.validatedTabs[tabId] = false;
           } else {
              // valid
             this.setTabHeaderState(tabHeader,state);
             this.validatedTabs[tabId] = true;
           }
        }

        base.setTabHeaderState = function (tabHeader, stateValid) {
          if (!stateValid) {
            if (tabHeader.hasClass('form-tab-invalid')) { // already marked invalid
              return;
            }

            tabHeader.addClass('form-tab-invalid');
            tabHeader.append('<span class="mark-invalid">&#32;&#42;</span>');
          } else {
            tabHeader.removeClass('form-tab-invalid');
            tabHeader.find('.mark-invalid').remove();
          }
        }

        // Run initializer
        base.init();
    };
    
    // Options 
    $.msp.formvalidator.defaultOptions = {
        option1: "",
        option2: "",
        events: {
            formInit: 'init.form.msp',
            formError: 'error.form.msp',
            formSuccess: 'success.form.msp',
            fieldInit: 'init.field.msp',
            fieldError: 'error.field.msp',
            fieldSuccess: 'success.field.msp',
            fieldStatus: 'status.field.msp',
            validatorError: 'error.validator.msp',
            validatorSuccess: 'success.validator.msp'
        }
    };
    
    /*
     * =============
     * FORMVALIDATOR 
     * ============= 
     */

    $.fn.msp_formvalidator = function(options, args){
        return this.each(function(){
            var $this = $(this),
                data = $this.data('msp.formvalidator'),
                option = typeof options == 'object' && options || typeof options == 'string' && options,
                arg = typeof args == 'object' && args || typeof args == 'string' && args
                if (!options && !args) (new $.msp.formvalidator(this, option));
                if (!data && options && args) return; 
                if (typeof options == 'string') data[option](arg);   
        });
    };
    
})(jQuery);
