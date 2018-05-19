'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function providesChildContext(instance) {
  return !!instance.getChildContext;
}

function isComponentClass(Comp) {
  return Comp.prototype && (Comp.prototype.render || Comp.prototype.isReactComponent);
}

function getProps(element) {
  return element.props || element.attributes;
}

var walkTree = function walkTree(element, context, visitor) {
  //是否是数组
  if (Array.isArray(element)) {
    element.forEach(function (item) {
      return walkTree(item, context, visitor);
    });
    return;
  }
  if (!element) return;
  //是否是reactElement
  if (_react2.default.isValidElement(element)) {
    if (typeof element.type === 'function') {
      var Comp = element.type;
      var props = Object.assign({}, Comp.defaultProps, getProps(element));
      var childContext = context;
      var child = void 0;
      if (isComponentClass(Comp)) {
        var instance = new Comp(props, context);
        instance.props = instance.props || props;
        instance.context = instance.context || context;
        // set the instance state to null (not undefined) if not set, to match React behaviour
        instance.state = instance.state || null;
        //执行willmount
        if (instance.componentWillMount) {
          instance.componentWillMount();
        }
        if (providesChildContext(instance)) {
          childContext = Object.assign({}, context, instance.getChildContext());
        }
        if (visitor(element, instance, context, childContext) === false) {
          return;
        }
        child = instance.render();
      } else {
        if (visitor(element, null, context) === false) {
          return;
        }
        child = Comp(props, context);
      }

      if (child) {
        if (Array.isArray(child)) {
          child.forEach(function (item) {
            return walkTree(item, childContext, visitor);
          });
        } else {
          walkTree(child, childContext, visitor);
        }
      }
    } else {
      // a basic string or dom element, just get children
      if (visitor(element, null, context) === false) {
        return;
      }

      if (element.props && element.props.children) {
        _react2.default.Children.forEach(element.props.children, function (child) {
          if (child) {
            walkTree(child, context, visitor);
          }
        });
      }
    }
    //console.log(element.type)
  } else if (typeof element === 'string' || typeof element === 'number') {
    // Just visit these, they are leaves so we don't keep traversing.
    visitor(element, null, context);
  }
};

function hasFetchDataFunction(instance) {
  return typeof instance.fetchData === 'function';
}

function isPromise(promise) {
  return typeof promise.then === 'function';
}

var getPromisesFromTree = function getPromisesFromTree(_ref) {
  var rootElement = _ref.rootElement,
      rootContext = _ref.rootContext;

  var promises = [];
  walkTree(rootElement, rootContext, function (_, instance, context, childContext) {

    if (instance && hasFetchDataFunction(instance)) {
      var promise = instance.fetchData();
      if (isPromise(promise)) {
        promises.push({ promise: promise, context: childContext || context, instance: instance });
        return false;
      }
    }
  });
  return promises;
};
var getDataFromTree = function getDataFromTree(rootElement, rootContext) {
  var promises = getPromisesFromTree({ rootElement: rootElement, rootContext: rootContext });
  //console.log(promises)
  if (!promises.length) {
    return Promise.resolve();
  }
  var errors = [];

  var mappedPromises = promises.map(function (_ref2) {
    var promise = _ref2.promise,
        context = _ref2.context,
        instance = _ref2.instance;

    return promise.then(function (_) {
      return getDataFromTree(instance.render(), context);
    }).catch(function (e) {
      return errors.push(e);
    });
  });

  return Promise.all(mappedPromises).then(function (_) {
    if (errors.length > 0) {
      var error = errors.length === 1 ? errors[0] : new Error(errors.length + ' errors were thrown when executing your fetchData functions.');
      error.queryErrors = errors;
      throw error;
    }
  });
};

exports.default = getDataFromTree;