import { WorkFlowContext } from "./WorkflowContext";
import { IPathInformation } from "./PathMaster";
export declare class File {
    context: WorkFlowContext;
    info: IPathInformation;
    absPath: string;
    contents: string;
    isLoaded: boolean;
    isNodeModuleEntry: boolean;
    constructor(context: WorkFlowContext, info: IPathInformation);
    consume(): string[];
}