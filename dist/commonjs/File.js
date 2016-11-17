"use strict";
const fs = require("fs");
const path = require("path");
const realm_utils_1 = require("realm-utils");
const acorn = require("acorn");
const ASTQ = require("astq");
let astq = new ASTQ();
require("acorn-es7")(acorn);
function extractRequires(contents, absPath) {
    let ast = acorn.parse(contents, {
        sourceType: "module",
        tolerant: true,
        ecmaVersion: 7,
        plugins: { es7: true },
    });
    let matches = [];
    matches = astq.query(ast, `// CallExpression[/Identifier[@name=="require"]], / ImportDeclaration[/Literal]`);
    let processVariables = [];
    let processDefined = astq.query(ast, `// VariableDeclarator/Identifier[@name=="process"]`);
    if (!processDefined.length) {
        processVariables = astq.query(ast, `// MemberExpression/Identifier[@name=="process"]`);
    }
    let extra = [];
    let results = [];
    matches.map(item => {
        if (item.arguments) {
            if (item.arguments[0]) {
                let name = item.arguments[0].value;
                if (!name) {
                    return;
                }
                results.push(name);
            }
        }
        if (item.source) {
            results.push(item.source.value);
        }
    });
    if (processVariables.length) {
        results.push("process");
        extra.push("process");
    }
    return {
        extra: extra,
        requires: results,
        ast: ast
    };
}
exports.extractRequires = extractRequires;
class File {
    constructor(context, info) {
        this.context = context;
        this.info = info;
        this.isLoaded = false;
        this.isNodeModuleEntry = false;
        this.resolving = [];
        this.absPath = info.absPath;
    }
    getCrossPlatormPath() {
        let name = this.absPath;
        name = name.replace(/\\/g, "/");
        return name;
    }
    tryPlugins(_ast) {
        if (this.context.plugins) {
            let target;
            let index = 0;
            while (!target && index < this.context.plugins.length) {
                let plugin = this.context.plugins[index];
                if (plugin.test.test(this.absPath)) {
                    target = plugin;
                }
                index++;
            }
            if (target) {
                if (realm_utils_1.utils.isFunction(target.transform)) {
                    let response = target.transform.apply(target, [this, _ast]);
                    if (realm_utils_1.utils.isPromise(response)) {
                        this.resolving.push(response);
                    }
                }
            }
        }
    }
    consume() {
        if (!this.absPath) {
            return [];
        }
        if (!fs.existsSync(this.info.absPath)) {
            this.contents = "";
            return [];
        }
        this.contents = fs.readFileSync(this.info.absPath).toString();
        this.isLoaded = true;
        if (this.absPath.match(/\.js$/)) {
            let data = extractRequires(this.contents, path.join(this.absPath));
            if (data.extra.length) {
                let code = [];
                data.extra.forEach(expr => {
                    code.push(`var ${expr} = require("${expr}");`);
                });
                this.contents = `${code.join("\n")}${this.contents}`;
            }
            this.tryPlugins(data.ast);
            return data.requires;
        }
        this.tryPlugins();
        return [];
    }
}
exports.File = File;