"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const collection_utils_1 = require("collection-utils");
const Annotation_1 = require("../Annotation");
const ConvenienceRenderer_1 = require("../ConvenienceRenderer");
const Naming_1 = require("../Naming");
const RendererOptions_1 = require("../RendererOptions");
const Source_1 = require("../Source");
const TargetLanguage_1 = require("../TargetLanguage");
const Type_1 = require("../Type");
const TypeUtils_1 = require("../TypeUtils");
const Support_1 = require("../support/Support");
const Strings_1 = require("../support/Strings");
// CONSTANTS
const forbiddenNames = [
    "if",
    "then",
    "else",
    "case",
    "of",
    "let",
    "in",
    "type",
    "module",
    "where",
    "import",
    "exposing",
    "as",
    "port",
    "always",
    "identity",
    "never",
    "e",
    "compare",
    "min",
    "max",
    "round",
    "floor",
    "ceiling",
    "Array",
    "List",
    "Dict",
    "Maybe",
    "Just",
    "Nothing",
    "Result",
    "Ok",
    "Err",
    "Int",
    "True",
    "False",
    "String",
    "Float",
    "encoder"
];
exports.elmOptions = {
    justTypes: new RendererOptions_1.BooleanOption("just-types", "Plain types only", false),
    moduleName: new RendererOptions_1.StringOption("module", "Generated module name", "NAME", "QuickType"),
    useArray: new RendererOptions_1.EnumOption("array-type", "Use Array or List (default is List)", [
        ["list", false],
        ["array", true]
    ])
};
// 🛠
const legalizeName = Strings_1.legalizeCharacters(cp => Strings_1.isAscii(cp) && Strings_1.isLetterOrUnderscoreOrDigit(cp));
function elmNameStyle(original, upper) {
    const words = Strings_1.splitIntoWords(original);
    return Strings_1.combineWords(words, legalizeName, upper ? Strings_1.firstUpperWordStyle : Strings_1.allLowerWordStyle, Strings_1.firstUpperWordStyle, upper ? Strings_1.allUpperWordStyle : Strings_1.allLowerWordStyle, Strings_1.allUpperWordStyle, "", Strings_1.isLetterOrUnderscore);
}
const lowerNamingFunction = Naming_1.funPrefixNamer("lower", n => elmNameStyle(n, false));
const upperNamingFunction = Naming_1.funPrefixNamer("upper", n => elmNameStyle(n, true));
function optional(fallback) {
    return { reqOrOpt: "Json.Decode.Pipeline.optional", fallback };
}
function requiredOrOptional(p) {
    const t = p.type;
    if (p.isOptional || (t instanceof Type_1.UnionType && TypeUtils_1.nullableFromUnion(t) !== null)) {
        return optional(" Nothing");
    }
    if (t.kind === "null") {
        return optional(" ()");
    }
    return { reqOrOpt: "Json.Decode.Pipeline.required", fallback: "" };
}
// RENDERER
class ElmRenderer extends ConvenienceRenderer_1.ConvenienceRenderer {
    constructor(targetLanguage, renderContext, _options) {
        super(targetLanguage, renderContext);
        this._options = _options;
        this._topLevelDependents = new Map();
        this._namedTypeDependents = new Map();
    }
    // NAMES
    // -----
    forbiddenForObjectProperties() {
        return { names: [], includeGlobalForbidden: true };
    }
    forbiddenNamesForGlobalNamespace() {
        return forbiddenNames;
    }
    get arrayType() {
        return this._options.useArray ? "Array" : "List";
    }
    get commentLineStart() {
        return "-- ";
    }
    get enumCasesInGlobalNamespace() {
        return true;
    }
    get unionMembersInGlobalNamespace() {
        return true;
    }
    makeEnumCaseNamer() {
        return upperNamingFunction;
    }
    makeNamedTypeDependencyNames(_, typeName) {
        const encoder = new Naming_1.DependencyName(lowerNamingFunction, typeName.order, lookup => `encode_${lookup(typeName)}`);
        const decoder = new Naming_1.DependencyName(lowerNamingFunction, typeName.order, lookup => lookup(typeName));
        const unit = new Naming_1.DependencyName(lowerNamingFunction, typeName.order, lookup => `${lookup(typeName)}_unit`);
        this._namedTypeDependents.set(typeName, { encoder, decoder, unit });
        return [encoder, decoder, unit];
    }
    makeNamedTypeNamer() {
        return upperNamingFunction;
    }
    makeTopLevelDependencyNames(t, topLevelName) {
        const encoder = new Naming_1.DependencyName(lowerNamingFunction, topLevelName.order, lookup => `${lookup(topLevelName)}_to_string`);
        let decoder = undefined;
        if (this.namedTypeToNameForTopLevel(t) === undefined) {
            decoder = new Naming_1.DependencyName(lowerNamingFunction, topLevelName.order, lookup => lookup(topLevelName));
        }
        this._topLevelDependents.set(topLevelName, { encoder, decoder });
        return decoder !== undefined ? [encoder, decoder] : [encoder];
    }
    makeUnionMemberNamer() {
        return upperNamingFunction;
    }
    namerForObjectProperty() {
        return lowerNamingFunction;
    }
    proposeUnionMemberName(u, unionName, fieldType, lookup) {
        const fieldName = super.proposeUnionMemberName(u, unionName, fieldType, lookup);
        return `${fieldName}_in_${lookup(unionName)}`;
    }
    unitNameForNamedType(t) {
        const name = this.nameForNamedType(t);
        return Support_1.defined(this._namedTypeDependents.get(name)).unit;
    }
    // TYPES & PROPERTIES
    // ------------------
    elmType(t, noOptional = false) {
        return TypeUtils_1.matchType(t, _anyType => Source_1.singleWord(Source_1.annotated(Annotation_1.anyTypeIssueAnnotation, "Json.Decode.Value")), _nullType => Source_1.singleWord(Source_1.annotated(Annotation_1.nullTypeIssueAnnotation, "()")), _boolType => Source_1.singleWord("Bool"), _integerType => Source_1.singleWord("Int"), _doubleType => Source_1.singleWord("Float"), _stringType => Source_1.singleWord("String"), arrayType => Source_1.multiWord(" ", this.arrayType, Source_1.parenIfNeeded(this.elmType(arrayType.items))), classType => Source_1.singleWord(this.nameForNamedType(classType)), mapType => Source_1.multiWord(" ", "Dict String", Source_1.parenIfNeeded(this.elmType(mapType.values))), enumType => Source_1.singleWord(this.nameForNamedType(enumType)), unionType => {
            const nullable = TypeUtils_1.nullableFromUnion(unionType);
            if (nullable !== null) {
                const nullableType = this.elmType(nullable);
                if (noOptional)
                    return nullableType;
                return Source_1.multiWord(" ", "Maybe", Source_1.parenIfNeeded(nullableType));
            }
            return Source_1.singleWord(this.nameForNamedType(unionType));
        });
    }
    elmProperty(p) {
        if (p.isOptional) {
            return Source_1.multiWord(" ", "Maybe", Source_1.parenIfNeeded(this.elmType(p.type, true))).source;
        }
        else {
            return this.elmType(p.type).source;
        }
    }
    // DECODING
    // --------
    decoderNameForNamedType(t) {
        const name = this.nameForNamedType(t);
        return Support_1.defined(this._namedTypeDependents.get(name)).decoder;
    }
    decoderNameForType(t, noOptional = false) {
        return TypeUtils_1.matchType(t, _anyType => Source_1.singleWord("Json.Decode.value"), _nullType => Source_1.multiWord(" ", "Json.Decode.null", "()"), _boolType => Source_1.singleWord("Json.Decode.bool"), _integerType => Source_1.singleWord("Json.Decode.int"), _doubleType => Source_1.singleWord("Json.Decode.float"), _stringType => Source_1.singleWord("Json.Decode.string"), arrayType => Source_1.multiWord(" ", ["Json.Decode.", Strings_1.decapitalize(this.arrayType)], Source_1.parenIfNeeded(this.decoderNameForType(arrayType.items))), classType => Source_1.singleWord(this.decoderNameForNamedType(classType)), mapType => Source_1.multiWord(" ", "Json.Decode.dict", Source_1.parenIfNeeded(this.decoderNameForType(mapType.values))), enumType => Source_1.singleWord(this.decoderNameForNamedType(enumType)), unionType => {
            const nullable = TypeUtils_1.nullableFromUnion(unionType);
            if (nullable !== null) {
                const nullableDecoder = this.decoderNameForType(nullable);
                if (noOptional)
                    return nullableDecoder;
                return Source_1.multiWord(" ", "Json.Decode.nullable", Source_1.parenIfNeeded(nullableDecoder));
            }
            return Source_1.singleWord(this.decoderNameForNamedType(unionType));
        });
    }
    decoderNameForProperty(p) {
        if (p.isOptional) {
            return Source_1.multiWord(" ", "Json.Decode.nullable", Source_1.parenIfNeeded(this.decoderNameForType(p.type, true)));
        }
        else {
            return this.decoderNameForType(p.type);
        }
    }
    // ENCODING
    // --------
    encoderNameForNamedType(t) {
        const name = this.nameForNamedType(t);
        return Support_1.defined(this._namedTypeDependents.get(name)).encoder;
    }
    encoderNameForType(t, noOptional = false) {
        return TypeUtils_1.matchType(t, _anyType => Source_1.singleWord("identity"), _nullType => Source_1.multiWord(" ", "always", "Json.Encode.null"), _boolType => Source_1.singleWord("Json.Encode.bool"), _integerType => Source_1.singleWord("Json.Encode.int"), _doubleType => Source_1.singleWord("Json.Encode.float"), _stringType => Source_1.singleWord("Json.Encode.string"), arrayType => Source_1.multiWord(" ", ["Json.Encode.", Strings_1.decapitalize(this.arrayType)], Source_1.parenIfNeeded(this.encoderNameForType(arrayType.items))), classType => Source_1.singleWord(this.encoderNameForNamedType(classType)), mapType => Source_1.multiWord(" ", "Json.Encode.dict identity", Source_1.parenIfNeeded(this.encoderNameForType(mapType.values))), enumType => Source_1.singleWord(this.encoderNameForNamedType(enumType)), unionType => {
            const nullable = TypeUtils_1.nullableFromUnion(unionType);
            if (nullable !== null) {
                const nullableEncoder = this.encoderNameForType(nullable);
                if (noOptional)
                    return nullableEncoder;
                return Source_1.multiWord(" ", "makeNullableEncoder", Source_1.parenIfNeeded(nullableEncoder));
            }
            return Source_1.singleWord(this.encoderNameForNamedType(unionType));
        });
    }
    encoderNameForProperty(p) {
        if (p.isOptional) {
            return Source_1.multiWord(" ", "makeNullableEncoder", Source_1.parenIfNeeded(this.encoderNameForType(p.type, true)));
        }
        else {
            return this.encoderNameForType(p.type);
        }
    }
    // EMITTERS
    // --------
    emitDescriptionBlock(lines) {
        if (lines.length === 1) {
            this.emitLine("{-| ", lines[0]);
            this.emitLine("-}");
        }
        else {
            this.emitCommentLines(lines, "", undefined, "\n-}", "{-| ");
        }
    }
    emitTopLevelDefinition(t, topLevelName) {
        this.emitLine("type alias ", topLevelName, " = ", this.elmType(t).source);
    }
    emitClassDefinition(c, className) {
        let description = this.descriptionForType(c);
        this.forEachClassProperty(c, "none", (name, jsonName) => {
            const propertyDescription = this.descriptionForClassProperty(c, jsonName);
            if (propertyDescription === undefined)
                return;
            if (description === undefined) {
                description = [];
            }
            else {
                description.push("");
            }
            description.push(`${this.sourcelikeToString(name)}:`);
            description.push(...propertyDescription);
        });
        this.emitDescription(description);
        this.emitLine("type alias ", className, " =");
        this.indent(() => {
            let onFirst = true;
            this.forEachClassProperty(c, "none", (name, _jsonName, p) => {
                this.emitLine(onFirst ? "{" : ",", " ", name, " : ", this.elmProperty(p));
                onFirst = false;
            });
            if (onFirst)
                this.emitLine("{");
            this.emitLine("}");
        });
    }
    emitEnumDefinition(e, enumName) {
        this.emitDescription(this.descriptionForType(e));
        this.emitLine("type ", enumName);
        this.indent(() => {
            let onFirst = true;
            this.forEachEnumCase(e, "none", name => {
                const equalsOrPipe = onFirst ? "=" : "|";
                this.emitLine(equalsOrPipe, " ", name);
                onFirst = false;
            });
        });
    }
    emitUnionDefinition(u, unionName) {
        this.emitDescription(this.descriptionForType(u));
        this.emitLine("type ", unionName);
        this.indent(() => {
            let onFirst = true;
            this.forEachUnionMember(u, null, "none", null, (constructor, t) => {
                const equalsOrPipe = onFirst ? "=" : "|";
                if (t.kind === "null") {
                    this.emitLine(equalsOrPipe, " ", constructor);
                }
                else {
                    this.emitLine(equalsOrPipe, " ", constructor, " ", Source_1.parenIfNeeded(this.elmType(t)));
                }
                onFirst = false;
            });
        });
    }
    emitTopLevelFunctions(t, topLevelName) {
        const { encoder, decoder } = Support_1.defined(this._topLevelDependents.get(topLevelName));
        if (this.namedTypeToNameForTopLevel(t) === undefined) {
            this.emitLine(Support_1.defined(decoder), " : Decoder ", topLevelName);
            this.emitLine(Support_1.defined(decoder), " = ", this.decoderNameForType(t).source);
            this.ensureBlankLine();
            this.ensureBlankLine();
        }
        this.emitLine(encoder, " : ", topLevelName, " -> String");
        this.emitLine(encoder, " = ", this.encoderNameForType(t).source, " >> Json.Encode.encode 0");
    }
    emitClassFunctions(c, className) {
        const decoderName = this.decoderNameForNamedType(c);
        const unitName = this.unitNameForNamedType(c);
        this.emitLine(decoderName, " : Json.Decode.Decoder ", className);
        this.emitLine(decoderName, " =");
        this.indent(() => {
            this.emitLine("Json.Decode.succeed ", className);
            this.indent(() => {
                this.forEachClassProperty(c, "none", (_, jsonName, p) => {
                    const propDecoder = Source_1.parenIfNeeded(this.decoderNameForProperty(p));
                    const { reqOrOpt, fallback } = requiredOrOptional(p);
                    this.emitLine("|> ", reqOrOpt, ' "', Strings_1.stringEscape(jsonName), '" ', propDecoder, fallback);
                });
            });
        });
        this.ensureBlankLine();
        const encoderName = this.encoderNameForNamedType(c);
        this.emitLine(encoderName, " : ", className, " -> Json.Encode.Value");
        this.emitLine(encoderName, " ", unitName, " =");
        this.indent(() => {
            this.emitLine("Json.Encode.object");
            this.indent(() => {
                let onFirst = true;
                this.forEachClassProperty(c, "none", (name, jsonName, p) => {
                    const bracketOrComma = onFirst ? "[" : ",";
                    const propEncoder = this.encoderNameForProperty(p).source;
                    this.emitLine(bracketOrComma, ' ("', Strings_1.stringEscape(jsonName), '", ', propEncoder, " ", unitName, ".", name, ")");
                    onFirst = false;
                });
                if (onFirst)
                    this.emitLine("[");
                this.emitLine("]");
            });
        });
    }
    emitEnumFunctions(e, enumName) {
        const decoderName = this.decoderNameForNamedType(e);
        const unitName = this.unitNameForNamedType(e);
        this.emitLine(decoderName, " : Json.Decode.Decoder ", enumName);
        this.emitLine(decoderName, " =");
        this.indent(() => {
            this.emitLine("Json.Decode.string");
            this.indent(() => {
                this.emitLine("|> Json.Decode.andThen (\\str ->");
                this.indent(() => {
                    this.emitLine("case str of");
                    this.indent(() => {
                        this.forEachEnumCase(e, "none", (name, jsonName) => {
                            this.emitLine('"', Strings_1.stringEscape(jsonName), '" -> Json.Decode.succeed ', name);
                        });
                        this.emitLine('somethingElse -> Json.Decode.fail <| "Invalid ', enumName, ': " ++ somethingElse');
                    });
                });
                this.emitLine(")");
            });
        });
        this.ensureBlankLine();
        const encoderName = this.encoderNameForNamedType(e);
        this.emitLine(encoderName, " : ", enumName, " -> Json.Encode.Value");
        this.emitLine(encoderName, " ", unitName, " = case ", unitName, " of");
        this.indent(() => {
            this.forEachEnumCase(e, "none", (name, jsonName) => {
                this.emitLine(name, ' -> Json.Encode.string "', Strings_1.stringEscape(jsonName), '"');
            });
        });
    }
    emitUnionFunctions(u, unionName) {
        // We need arrays first, then strings, and integers before doubles.
        function sortOrder(_, t) {
            if (t.kind === "array") {
                return "  array";
            }
            else if (t.kind === "double") {
                return " xdouble";
            }
            else if (t.isPrimitive()) {
                return " " + t.kind;
            }
            return t.kind;
        }
        const decoderName = this.decoderNameForNamedType(u);
        this.emitLine(decoderName, " : Json.Decode.Decoder ", unionName);
        this.emitLine(decoderName, " =");
        this.indent(() => {
            this.emitLine("Json.Decode.oneOf");
            this.indent(() => {
                let onFirst = true;
                this.forEachUnionMember(u, null, "none", sortOrder, (constructor, t) => {
                    const bracketOrComma = onFirst ? "[" : ",";
                    if (t.kind === "null") {
                        this.emitLine(bracketOrComma, " Json.Decode.null ", constructor);
                    }
                    else {
                        const decoder = Source_1.parenIfNeeded(this.decoderNameForType(t));
                        this.emitLine(bracketOrComma, " Json.Decode.map ", constructor, " ", decoder);
                    }
                    onFirst = false;
                });
                this.emitLine("]");
            });
        });
        this.ensureBlankLine();
        const encoderName = this.encoderNameForNamedType(u);
        const unitName = this.unitNameForNamedType(u);
        this.emitLine(encoderName, " : ", unionName, " -> Json.Encode.Value");
        this.emitLine(encoderName, " ", unitName, " = case ", unitName, " of");
        this.indent(() => {
            this.forEachUnionMember(u, null, "none", sortOrder, (constructor, t) => {
                if (t.kind === "null") {
                    this.emitLine(constructor, " -> Json.Encode.null");
                }
                else {
                    const encoder = this.encoderNameForType(t).source;
                    this.emitLine(constructor, " y -> ", encoder, " y");
                }
            });
        });
    }
    emitSourceStructure() {
        const exports = [];
        const topLevelDecoders = [];
        this.forEachTopLevel("none", (_, name) => {
            let { encoder, decoder } = Support_1.defined(this._topLevelDependents.get(name));
            const namedTypeDependents = Support_1.defined(this._namedTypeDependents.get(name));
            if (decoder === undefined) {
                decoder = namedTypeDependents.decoder;
            }
            const rawEncoder = namedTypeDependents.encoder;
            topLevelDecoders.push(decoder);
            exports.push(name, encoder, rawEncoder, decoder);
        });
        this.forEachObject("none", (t, name) => {
            if (!collection_utils_1.mapContains(this.topLevels, t))
                exports.push(name);
        });
        this.forEachEnum("none", (t, name) => {
            if (!collection_utils_1.mapContains(this.topLevels, t))
                exports.push([name, "(..)"]);
        });
        this.forEachUnion("none", (t, name) => {
            if (!collection_utils_1.mapContains(this.topLevels, t))
                exports.push([name, "(..)"]);
        });
        if (!this._options.justTypes) {
            this.ensureBlankLine();
            this.emitLine("module ", this._options.moduleName, " exposing");
            this.indent(() => {
                for (let i = 0; i < exports.length; i++) {
                    this.emitLine(i === 0 ? "(" : ",", " ", exports[i]);
                }
                this.emitLine(")");
            });
        }
        if (this.leadingComments !== undefined) {
            this.emitCommentLines(this.leadingComments);
        }
        else if (!this._options.justTypes) {
            const decoders = [];
            this.forEachTopLevel("none", (_, name) => {
                let { decoder } = Support_1.defined(this._topLevelDependents.get(name));
                if (decoder === undefined) {
                    decoder = Support_1.defined(this._namedTypeDependents.get(name)).decoder;
                }
                decoders.push(decoder);
            });
            this.ensureBlankLine();
            this.emitDescriptionBlock([
                "To decode the JSON data, add this file to your project, run:",
                "",
                "        elm install NoRedInk/elm-json-decode-pipeline",
                "",
                "add these imports",
                "",
                "        import Json.Decode",
                `        import ${this._options.moduleName} exposing (${this.sourcelikeToString(collection_utils_1.arrayIntercalate(", ", topLevelDecoders))})`,
                "",
                "and you're off to the races with",
                ""
            ].concat(decoders.map(decoder => `        Json.Decode.decodeValue ${decoder} myJsonValue`)));
        }
        if (!this._options.justTypes) {
            this.ensureBlankLine();
            this.emitMultiline(`import Json.Decode exposing (Decoder)
import Json.Decode.Pipeline
import Json.Encode
import Dict exposing (Dict)`);
            if (this._options.useArray) {
                this.emitLine("import Array exposing (Array)");
            }
            else {
                this.emitLine("import List");
            }
            this.ensureBlankLine();
        }
        this.forEachTopLevel("leading-and-interposing", (t, topLevelName) => this.emitTopLevelDefinition(t, topLevelName), t => this.namedTypeToNameForTopLevel(t) === undefined);
        this.forEachNamedType("leading-and-interposing", (c, className) => this.emitClassDefinition(c, className), (e, enumName) => this.emitEnumDefinition(e, enumName), (u, unionName) => this.emitUnionDefinition(u, unionName));
        if (this._options.justTypes)
            return;
        this.ensureBlankLine();
        this.ensureBlankLine();
        this.ensureBlankLine();
        this.emitLine("-- Decoders & Encoders");
        this.forEachTopLevel("leading-and-interposing", (t, topLevelName) => this.emitTopLevelFunctions(t, topLevelName));
        this.forEachNamedType("leading-and-interposing", (c, className) => this.emitClassFunctions(c, className), (e, enumName) => this.emitEnumFunctions(e, enumName), (u, unionName) => this.emitUnionFunctions(u, unionName));
        this.ensureBlankLine();
        this.ensureBlankLine();
        this.ensureBlankLine();
        this.emitLine("--- Helpers");
        this.ensureBlankLine();
        this.ensureBlankLine();
        this.emitMultiline(`makeNullableEncoder : (a -> Json.Encode.Value) -> Maybe a -> Json.Encode.Value
makeNullableEncoder encoder =
    Maybe.map encoder >> Maybe.withDefault Json.Encode.null`);
    }
}
exports.ElmRenderer = ElmRenderer;
// TARGET
class ElmTargetLanguage extends TargetLanguage_1.TargetLanguage {
    constructor() {
        super("Elm", ["elm"], "elm");
    }
    getOptions() {
        return [exports.elmOptions.justTypes, exports.elmOptions.moduleName, exports.elmOptions.useArray];
    }
    get supportsOptionalClassProperties() {
        return true;
    }
    get supportsUnionsWithBothNumberTypes() {
        return true;
    }
    makeRenderer(renderContext, untypedOptionValues) {
        return new ElmRenderer(this, renderContext, RendererOptions_1.getOptionValues(exports.elmOptions, untypedOptionValues));
    }
}
exports.ElmTargetLanguage = ElmTargetLanguage;
