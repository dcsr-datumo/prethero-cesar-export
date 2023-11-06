const { DaSCH } = require("./DaSCH.js");

exports.DaSCHClass = class {
    #id;
    sources;

    getId() {
        return this.#id;
    }

    constructor(raw) {
        this.sources = DaSCH.ark(raw);
        this.#id = DaSCH.id(raw);
    }
}