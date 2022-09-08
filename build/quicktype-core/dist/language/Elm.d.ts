import { ConvenienceRenderer, ForbiddenWordsInfo } from "../ConvenienceRenderer";
import { Namer, Name, DependencyName } from "../Naming";
import { RenderContext } from "../Renderer";
import { EnumOption, StringOption, BooleanOption, Option, OptionValues } from "../RendererOptions";
import { Sourcelike } from "../Source";
import { TargetLanguage } from "../TargetLanguage";
import { Type, UnionType } from "../Type";
export declare const elmOptions: {
    justTypes: BooleanOption;
    moduleName: StringOption;
    useArray: EnumOption<boolean>;
};
export declare class ElmRenderer extends ConvenienceRenderer {
    private readonly _options;
    private readonly _topLevelDependents;
    private readonly _namedTypeDependents;
    constructor(targetLanguage: TargetLanguage, renderContext: RenderContext, _options: OptionValues<typeof elmOptions>);
    protected forbiddenForObjectProperties(): ForbiddenWordsInfo;
    protected forbiddenNamesForGlobalNamespace(): string[];
    private readonly arrayType;
    protected readonly commentLineStart: string;
    protected readonly enumCasesInGlobalNamespace: boolean;
    protected readonly unionMembersInGlobalNamespace: boolean;
    protected makeEnumCaseNamer(): Namer;
    protected makeNamedTypeDependencyNames(_: Type, typeName: Name): DependencyName[];
    protected makeNamedTypeNamer(): Namer;
    protected makeTopLevelDependencyNames(t: Type, topLevelName: Name): DependencyName[];
    protected makeUnionMemberNamer(): Namer;
    protected namerForObjectProperty(): Namer;
    protected proposeUnionMemberName(u: UnionType, unionName: Name, fieldType: Type, lookup: (n: Name) => string): string;
    private unitNameForNamedType;
    private elmType;
    private elmProperty;
    private decoderNameForNamedType;
    private decoderNameForType;
    private decoderNameForProperty;
    private encoderNameForNamedType;
    private encoderNameForType;
    private encoderNameForProperty;
    protected emitDescriptionBlock(lines: Sourcelike[]): void;
    private emitTopLevelDefinition;
    private emitClassDefinition;
    private emitEnumDefinition;
    private emitUnionDefinition;
    private emitTopLevelFunctions;
    private emitClassFunctions;
    private emitEnumFunctions;
    private emitUnionFunctions;
    protected emitSourceStructure(): void;
}
export declare class ElmTargetLanguage extends TargetLanguage {
    constructor();
    protected getOptions(): Option<unknown>[];
    readonly supportsOptionalClassProperties: boolean;
    readonly supportsUnionsWithBothNumberTypes: boolean;
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: {
        [name: string]: unknown;
    }): ElmRenderer;
}
