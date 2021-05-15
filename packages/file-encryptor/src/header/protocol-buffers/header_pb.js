// source: header.proto
/**
 * @fileoverview
 * @enhanceable
 * @suppress {missingRequire} reports error on implicit type usages.
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!
/* eslint-disable */
// @ts-nocheck

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

goog.exportSymbol('proto.Argon2Options', null, global);
goog.exportSymbol('proto.Argon2Options.Argon2Type', null, global);
goog.exportSymbol('proto.Header', null, global);
goog.exportSymbol('proto.Header.CompressAlgorithm', null, global);
goog.exportSymbol('proto.Header.CryptoAlgorithm', null, global);
goog.exportSymbol('proto.Header.KeyOptionsCase', null, global);
goog.exportSymbol('proto.SimpleHeader', null, global);
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.Argon2Options = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.Argon2Options, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.Argon2Options.displayName = 'proto.Argon2Options';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.Header = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, proto.Header.oneofGroups_);
};
goog.inherits(proto.Header, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.Header.displayName = 'proto.Header';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.SimpleHeader = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.SimpleHeader, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.SimpleHeader.displayName = 'proto.SimpleHeader';
}



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.Argon2Options.prototype.toObject = function(opt_includeInstance) {
  return proto.Argon2Options.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.Argon2Options} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.Argon2Options.toObject = function(includeInstance, msg) {
  var f, obj = {
    type: jspb.Message.getFieldWithDefault(msg, 1, 0),
    timeIterations: jspb.Message.getFieldWithDefault(msg, 2, 0),
    memoryKib: jspb.Message.getFieldWithDefault(msg, 3, 0),
    parallelism: jspb.Message.getFieldWithDefault(msg, 4, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.Argon2Options}
 */
proto.Argon2Options.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.Argon2Options;
  return proto.Argon2Options.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.Argon2Options} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.Argon2Options}
 */
proto.Argon2Options.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {!proto.Argon2Options.Argon2Type} */ (reader.readEnum());
      msg.setType(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readUint32());
      msg.setTimeIterations(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readUint32());
      msg.setMemoryKib(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readUint32());
      msg.setParallelism(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.Argon2Options.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.Argon2Options.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.Argon2Options} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.Argon2Options.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = /** @type {!proto.Argon2Options.Argon2Type} */ (jspb.Message.getField(message, 1));
  if (f != null) {
    writer.writeEnum(
      1,
      f
    );
  }
  f = /** @type {number} */ (jspb.Message.getField(message, 2));
  if (f != null) {
    writer.writeUint32(
      2,
      f
    );
  }
  f = /** @type {number} */ (jspb.Message.getField(message, 3));
  if (f != null) {
    writer.writeUint32(
      3,
      f
    );
  }
  f = /** @type {number} */ (jspb.Message.getField(message, 4));
  if (f != null) {
    writer.writeUint32(
      4,
      f
    );
  }
};


/**
 * @enum {number}
 */
proto.Argon2Options.Argon2Type = {
  ARGON2D: 0,
  ARGON2ID: 1
};

/**
 * optional Argon2Type type = 1;
 * @return {!proto.Argon2Options.Argon2Type}
 */
proto.Argon2Options.prototype.getType = function() {
  return /** @type {!proto.Argon2Options.Argon2Type} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/**
 * @param {!proto.Argon2Options.Argon2Type} value
 * @return {!proto.Argon2Options} returns this
 */
proto.Argon2Options.prototype.setType = function(value) {
  return jspb.Message.setField(this, 1, value);
};


/**
 * Clears the field making it undefined.
 * @return {!proto.Argon2Options} returns this
 */
proto.Argon2Options.prototype.clearType = function() {
  return jspb.Message.setField(this, 1, undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.Argon2Options.prototype.hasType = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional uint32 time_iterations = 2;
 * @return {number}
 */
proto.Argon2Options.prototype.getTimeIterations = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 2, 0));
};


/**
 * @param {number} value
 * @return {!proto.Argon2Options} returns this
 */
proto.Argon2Options.prototype.setTimeIterations = function(value) {
  return jspb.Message.setField(this, 2, value);
};


/**
 * Clears the field making it undefined.
 * @return {!proto.Argon2Options} returns this
 */
proto.Argon2Options.prototype.clearTimeIterations = function() {
  return jspb.Message.setField(this, 2, undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.Argon2Options.prototype.hasTimeIterations = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional uint32 memory_kib = 3;
 * @return {number}
 */
proto.Argon2Options.prototype.getMemoryKib = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/**
 * @param {number} value
 * @return {!proto.Argon2Options} returns this
 */
proto.Argon2Options.prototype.setMemoryKib = function(value) {
  return jspb.Message.setField(this, 3, value);
};


/**
 * Clears the field making it undefined.
 * @return {!proto.Argon2Options} returns this
 */
proto.Argon2Options.prototype.clearMemoryKib = function() {
  return jspb.Message.setField(this, 3, undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.Argon2Options.prototype.hasMemoryKib = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional uint32 parallelism = 4;
 * @return {number}
 */
proto.Argon2Options.prototype.getParallelism = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/**
 * @param {number} value
 * @return {!proto.Argon2Options} returns this
 */
proto.Argon2Options.prototype.setParallelism = function(value) {
  return jspb.Message.setField(this, 4, value);
};


/**
 * Clears the field making it undefined.
 * @return {!proto.Argon2Options} returns this
 */
proto.Argon2Options.prototype.clearParallelism = function() {
  return jspb.Message.setField(this, 4, undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.Argon2Options.prototype.hasParallelism = function() {
  return jspb.Message.getField(this, 4) != null;
};



/**
 * Oneof group definitions for this message. Each group defines the field
 * numbers belonging to that group. When of these fields' value is set, all
 * other fields in the group are cleared. During deserialization, if multiple
 * fields are encountered for a group, only the last value seen will be kept.
 * @private {!Array<!Array<number>>}
 * @const
 */
proto.Header.oneofGroups_ = [[15]];

/**
 * @enum {number}
 */
proto.Header.KeyOptionsCase = {
  KEY_OPTIONS_NOT_SET: 0,
  ARGON2_KEY_OPTIONS: 15
};

/**
 * @return {proto.Header.KeyOptionsCase}
 */
proto.Header.prototype.getKeyOptionsCase = function() {
  return /** @type {proto.Header.KeyOptionsCase} */(jspb.Message.computeOneofCase(this, proto.Header.oneofGroups_[0]));
};



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.Header.prototype.toObject = function(opt_includeInstance) {
  return proto.Header.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.Header} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.Header.toObject = function(includeInstance, msg) {
  var f, obj = {
    cryptoNonce: msg.getCryptoNonce_asB64(),
    cryptoAuthTag: msg.getCryptoAuthTag_asB64(),
    cryptoAlgorithm: jspb.Message.getFieldWithDefault(msg, 3, 0),
    keySalt: msg.getKeySalt_asB64(),
    keyLength: jspb.Message.getFieldWithDefault(msg, 5, 0),
    argon2KeyOptions: (f = msg.getArgon2KeyOptions()) && proto.Argon2Options.toObject(includeInstance, f),
    compressAlgorithm: jspb.Message.getFieldWithDefault(msg, 6, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.Header}
 */
proto.Header.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.Header;
  return proto.Header.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.Header} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.Header}
 */
proto.Header.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {!Uint8Array} */ (reader.readBytes());
      msg.setCryptoNonce(value);
      break;
    case 2:
      var value = /** @type {!Uint8Array} */ (reader.readBytes());
      msg.setCryptoAuthTag(value);
      break;
    case 3:
      var value = /** @type {!proto.Header.CryptoAlgorithm} */ (reader.readEnum());
      msg.setCryptoAlgorithm(value);
      break;
    case 4:
      var value = /** @type {!Uint8Array} */ (reader.readBytes());
      msg.setKeySalt(value);
      break;
    case 5:
      var value = /** @type {number} */ (reader.readUint32());
      msg.setKeyLength(value);
      break;
    case 15:
      var value = new proto.Argon2Options;
      reader.readMessage(value,proto.Argon2Options.deserializeBinaryFromReader);
      msg.setArgon2KeyOptions(value);
      break;
    case 6:
      var value = /** @type {!proto.Header.CompressAlgorithm} */ (reader.readEnum());
      msg.setCompressAlgorithm(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.Header.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.Header.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.Header} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.Header.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = /** @type {!(string|Uint8Array)} */ (jspb.Message.getField(message, 1));
  if (f != null) {
    writer.writeBytes(
      1,
      f
    );
  }
  f = /** @type {!(string|Uint8Array)} */ (jspb.Message.getField(message, 2));
  if (f != null) {
    writer.writeBytes(
      2,
      f
    );
  }
  f = /** @type {!proto.Header.CryptoAlgorithm} */ (jspb.Message.getField(message, 3));
  if (f != null) {
    writer.writeEnum(
      3,
      f
    );
  }
  f = /** @type {!(string|Uint8Array)} */ (jspb.Message.getField(message, 4));
  if (f != null) {
    writer.writeBytes(
      4,
      f
    );
  }
  f = /** @type {number} */ (jspb.Message.getField(message, 5));
  if (f != null) {
    writer.writeUint32(
      5,
      f
    );
  }
  f = message.getArgon2KeyOptions();
  if (f != null) {
    writer.writeMessage(
      15,
      f,
      proto.Argon2Options.serializeBinaryToWriter
    );
  }
  f = /** @type {!proto.Header.CompressAlgorithm} */ (jspb.Message.getField(message, 6));
  if (f != null) {
    writer.writeEnum(
      6,
      f
    );
  }
};


/**
 * @enum {number}
 */
proto.Header.CryptoAlgorithm = {
  AES_256_GCM: 0,
  CHACHA20_POLY1305: 1
};

/**
 * @enum {number}
 */
proto.Header.CompressAlgorithm = {
  NONE: 0,
  GZIP: 1,
  BROTLI: 2
};

/**
 * optional bytes crypto_nonce = 1;
 * @return {!(string|Uint8Array)}
 */
proto.Header.prototype.getCryptoNonce = function() {
  return /** @type {!(string|Uint8Array)} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * optional bytes crypto_nonce = 1;
 * This is a type-conversion wrapper around `getCryptoNonce()`
 * @return {string}
 */
proto.Header.prototype.getCryptoNonce_asB64 = function() {
  return /** @type {string} */ (jspb.Message.bytesAsB64(
      this.getCryptoNonce()));
};


/**
 * optional bytes crypto_nonce = 1;
 * Note that Uint8Array is not supported on all browsers.
 * @see http://caniuse.com/Uint8Array
 * This is a type-conversion wrapper around `getCryptoNonce()`
 * @return {!Uint8Array}
 */
proto.Header.prototype.getCryptoNonce_asU8 = function() {
  return /** @type {!Uint8Array} */ (jspb.Message.bytesAsU8(
      this.getCryptoNonce()));
};


/**
 * @param {!(string|Uint8Array)} value
 * @return {!proto.Header} returns this
 */
proto.Header.prototype.setCryptoNonce = function(value) {
  return jspb.Message.setField(this, 1, value);
};


/**
 * Clears the field making it undefined.
 * @return {!proto.Header} returns this
 */
proto.Header.prototype.clearCryptoNonce = function() {
  return jspb.Message.setField(this, 1, undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.Header.prototype.hasCryptoNonce = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional bytes crypto_auth_tag = 2;
 * @return {!(string|Uint8Array)}
 */
proto.Header.prototype.getCryptoAuthTag = function() {
  return /** @type {!(string|Uint8Array)} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * optional bytes crypto_auth_tag = 2;
 * This is a type-conversion wrapper around `getCryptoAuthTag()`
 * @return {string}
 */
proto.Header.prototype.getCryptoAuthTag_asB64 = function() {
  return /** @type {string} */ (jspb.Message.bytesAsB64(
      this.getCryptoAuthTag()));
};


/**
 * optional bytes crypto_auth_tag = 2;
 * Note that Uint8Array is not supported on all browsers.
 * @see http://caniuse.com/Uint8Array
 * This is a type-conversion wrapper around `getCryptoAuthTag()`
 * @return {!Uint8Array}
 */
proto.Header.prototype.getCryptoAuthTag_asU8 = function() {
  return /** @type {!Uint8Array} */ (jspb.Message.bytesAsU8(
      this.getCryptoAuthTag()));
};


/**
 * @param {!(string|Uint8Array)} value
 * @return {!proto.Header} returns this
 */
proto.Header.prototype.setCryptoAuthTag = function(value) {
  return jspb.Message.setField(this, 2, value);
};


/**
 * Clears the field making it undefined.
 * @return {!proto.Header} returns this
 */
proto.Header.prototype.clearCryptoAuthTag = function() {
  return jspb.Message.setField(this, 2, undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.Header.prototype.hasCryptoAuthTag = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional CryptoAlgorithm crypto_algorithm = 3;
 * @return {!proto.Header.CryptoAlgorithm}
 */
proto.Header.prototype.getCryptoAlgorithm = function() {
  return /** @type {!proto.Header.CryptoAlgorithm} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/**
 * @param {!proto.Header.CryptoAlgorithm} value
 * @return {!proto.Header} returns this
 */
proto.Header.prototype.setCryptoAlgorithm = function(value) {
  return jspb.Message.setField(this, 3, value);
};


/**
 * Clears the field making it undefined.
 * @return {!proto.Header} returns this
 */
proto.Header.prototype.clearCryptoAlgorithm = function() {
  return jspb.Message.setField(this, 3, undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.Header.prototype.hasCryptoAlgorithm = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional bytes key_salt = 4;
 * @return {!(string|Uint8Array)}
 */
proto.Header.prototype.getKeySalt = function() {
  return /** @type {!(string|Uint8Array)} */ (jspb.Message.getFieldWithDefault(this, 4, ""));
};


/**
 * optional bytes key_salt = 4;
 * This is a type-conversion wrapper around `getKeySalt()`
 * @return {string}
 */
proto.Header.prototype.getKeySalt_asB64 = function() {
  return /** @type {string} */ (jspb.Message.bytesAsB64(
      this.getKeySalt()));
};


/**
 * optional bytes key_salt = 4;
 * Note that Uint8Array is not supported on all browsers.
 * @see http://caniuse.com/Uint8Array
 * This is a type-conversion wrapper around `getKeySalt()`
 * @return {!Uint8Array}
 */
proto.Header.prototype.getKeySalt_asU8 = function() {
  return /** @type {!Uint8Array} */ (jspb.Message.bytesAsU8(
      this.getKeySalt()));
};


/**
 * @param {!(string|Uint8Array)} value
 * @return {!proto.Header} returns this
 */
proto.Header.prototype.setKeySalt = function(value) {
  return jspb.Message.setField(this, 4, value);
};


/**
 * Clears the field making it undefined.
 * @return {!proto.Header} returns this
 */
proto.Header.prototype.clearKeySalt = function() {
  return jspb.Message.setField(this, 4, undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.Header.prototype.hasKeySalt = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional uint32 key_length = 5;
 * @return {number}
 */
proto.Header.prototype.getKeyLength = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 5, 0));
};


/**
 * @param {number} value
 * @return {!proto.Header} returns this
 */
proto.Header.prototype.setKeyLength = function(value) {
  return jspb.Message.setField(this, 5, value);
};


/**
 * Clears the field making it undefined.
 * @return {!proto.Header} returns this
 */
proto.Header.prototype.clearKeyLength = function() {
  return jspb.Message.setField(this, 5, undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.Header.prototype.hasKeyLength = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * optional Argon2Options argon2_key_options = 15;
 * @return {?proto.Argon2Options}
 */
proto.Header.prototype.getArgon2KeyOptions = function() {
  return /** @type{?proto.Argon2Options} */ (
    jspb.Message.getWrapperField(this, proto.Argon2Options, 15));
};


/**
 * @param {?proto.Argon2Options|undefined} value
 * @return {!proto.Header} returns this
*/
proto.Header.prototype.setArgon2KeyOptions = function(value) {
  return jspb.Message.setOneofWrapperField(this, 15, proto.Header.oneofGroups_[0], value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.Header} returns this
 */
proto.Header.prototype.clearArgon2KeyOptions = function() {
  return this.setArgon2KeyOptions(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.Header.prototype.hasArgon2KeyOptions = function() {
  return jspb.Message.getField(this, 15) != null;
};


/**
 * optional CompressAlgorithm compress_algorithm = 6;
 * @return {!proto.Header.CompressAlgorithm}
 */
proto.Header.prototype.getCompressAlgorithm = function() {
  return /** @type {!proto.Header.CompressAlgorithm} */ (jspb.Message.getFieldWithDefault(this, 6, 0));
};


/**
 * @param {!proto.Header.CompressAlgorithm} value
 * @return {!proto.Header} returns this
 */
proto.Header.prototype.setCompressAlgorithm = function(value) {
  return jspb.Message.setField(this, 6, value);
};


/**
 * Clears the field making it undefined.
 * @return {!proto.Header} returns this
 */
proto.Header.prototype.clearCompressAlgorithm = function() {
  return jspb.Message.setField(this, 6, undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.Header.prototype.hasCompressAlgorithm = function() {
  return jspb.Message.getField(this, 6) != null;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.SimpleHeader.prototype.toObject = function(opt_includeInstance) {
  return proto.SimpleHeader.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.SimpleHeader} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SimpleHeader.toObject = function(includeInstance, msg) {
  var f, obj = {
    cryptoAuthTag: msg.getCryptoAuthTag_asB64(),
    cryptoNonceCounterAddOrReset: jspb.Message.getFieldWithDefault(msg, 2, "0"),
    cryptoNonceFixedAdd: jspb.Message.getFieldWithDefault(msg, 3, "0")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.SimpleHeader}
 */
proto.SimpleHeader.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.SimpleHeader;
  return proto.SimpleHeader.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.SimpleHeader} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.SimpleHeader}
 */
proto.SimpleHeader.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {!Uint8Array} */ (reader.readBytes());
      msg.setCryptoAuthTag(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readUint64String());
      msg.setCryptoNonceCounterAddOrReset(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readUint64String());
      msg.setCryptoNonceFixedAdd(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.SimpleHeader.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.SimpleHeader.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.SimpleHeader} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.SimpleHeader.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = /** @type {!(string|Uint8Array)} */ (jspb.Message.getField(message, 1));
  if (f != null) {
    writer.writeBytes(
      1,
      f
    );
  }
  f = message.getCryptoNonceCounterAddOrReset();
  if (parseInt(f, 10) !== 0) {
    writer.writeUint64String(
      2,
      f
    );
  }
  f = message.getCryptoNonceFixedAdd();
  if (parseInt(f, 10) !== 0) {
    writer.writeUint64String(
      3,
      f
    );
  }
};


/**
 * optional bytes crypto_auth_tag = 1;
 * @return {!(string|Uint8Array)}
 */
proto.SimpleHeader.prototype.getCryptoAuthTag = function() {
  return /** @type {!(string|Uint8Array)} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * optional bytes crypto_auth_tag = 1;
 * This is a type-conversion wrapper around `getCryptoAuthTag()`
 * @return {string}
 */
proto.SimpleHeader.prototype.getCryptoAuthTag_asB64 = function() {
  return /** @type {string} */ (jspb.Message.bytesAsB64(
      this.getCryptoAuthTag()));
};


/**
 * optional bytes crypto_auth_tag = 1;
 * Note that Uint8Array is not supported on all browsers.
 * @see http://caniuse.com/Uint8Array
 * This is a type-conversion wrapper around `getCryptoAuthTag()`
 * @return {!Uint8Array}
 */
proto.SimpleHeader.prototype.getCryptoAuthTag_asU8 = function() {
  return /** @type {!Uint8Array} */ (jspb.Message.bytesAsU8(
      this.getCryptoAuthTag()));
};


/**
 * @param {!(string|Uint8Array)} value
 * @return {!proto.SimpleHeader} returns this
 */
proto.SimpleHeader.prototype.setCryptoAuthTag = function(value) {
  return jspb.Message.setField(this, 1, value);
};


/**
 * Clears the field making it undefined.
 * @return {!proto.SimpleHeader} returns this
 */
proto.SimpleHeader.prototype.clearCryptoAuthTag = function() {
  return jspb.Message.setField(this, 1, undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.SimpleHeader.prototype.hasCryptoAuthTag = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional uint64 crypto_nonce_counter_add_or_reset = 2;
 * @return {string}
 */
proto.SimpleHeader.prototype.getCryptoNonceCounterAddOrReset = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, "0"));
};


/**
 * @param {string} value
 * @return {!proto.SimpleHeader} returns this
 */
proto.SimpleHeader.prototype.setCryptoNonceCounterAddOrReset = function(value) {
  return jspb.Message.setProto3StringIntField(this, 2, value);
};


/**
 * optional uint64 crypto_nonce_fixed_add = 3;
 * @return {string}
 */
proto.SimpleHeader.prototype.getCryptoNonceFixedAdd = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, "0"));
};


/**
 * @param {string} value
 * @return {!proto.SimpleHeader} returns this
 */
proto.SimpleHeader.prototype.setCryptoNonceFixedAdd = function(value) {
  return jspb.Message.setProto3StringIntField(this, 3, value);
};


goog.object.extend(exports, proto);
