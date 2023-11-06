const { DaSCH } = require("./lib/DaSCH.js");
const { DaSCHClass } = require("./lib/DaSCHClass.js");
const { Author } = require("./Author.js");

exports.PerformancePerson = class extends DaSCHClass {
    constructor(raw) {
        super(raw);

        this.label = raw["rdfs:label"];

        try {
            this.person_id = DaSCH.getLinkTargetId(raw, "prethero:functionIsCarriedOutByValue");
        } catch (error) {
            // this.person_id = undefined;
        }

        try {
            this.function_id = DaSCH.getListNodeId(raw, "prethero:functionHasType");
        } catch (error) {
            // this.function_id = undefined;
        }

    }

    getListsAndLinks(dasch) {
        return this.getListsAndLinksMapReduce(dasch);
        // return this.getListsAndLinksChained(dasch);
    }

    getListsAndLinksChained(dasch) {
        // alternative to (maybe less?) readable map/reduce
        // it is not exactly the same, I might investigate somtime
        let promiseChain = Promise.resolve();
        let lastPromise = promiseChain;
        if (this.person_id) {
            this.person = [];
            this.person_id.forEach(
                (iri) => {
                    lastPromise = lastPromise.then(() => {
                        // no assignation, only use the side effect of cache to later write the list of historical persons
                        Author.getAuthor(iri, dasch);
                    });
                }
            )
            delete this.person_id;
        }
        return promiseChain;
    }

    getListsAndLinksMapReduce(dasch) {
        if (!(this.person_id && this.function_id)) {
            return Promise.resolve(this);
        }

        let promises = [];

        if (this.person_id) {
            // this.person = [];
            promises = this.person_id.map((iri) => {
                // no assignation, only use the side effect of cache to later write the list of historical persons
                return Author.getAuthor(iri, dasch);
                // .then((author) => { this.person.push(author); });
            });
        }

        if (this.function_id) {
            this.activity_id = [];
            promises = promises.concat(
                this.function_id.map(
                    (iri) => {
                        return new Promise((resolve, reject = (error) => { throw error; }) => {
                            dasch.getListNode(
                                iri,
                                (data) => { this.activity_id.push(data); resolve(data); },
                                reject
                            );
                        });
                    }
                )
            );
            delete this.function_id;
        }

        // make sure to always resolve as this PerformancePerson
        promises.push(this);

        // make sure to explore the graph before resolving this
        return promises.reduce(
            (chainPromises, nextPromise) => {
                return chainPromises.then(() => {
                    return nextPromise;
                });
            }
        );
    }

    isAttachedToAPerson() {
        let isAPerson = false;
        // we have to have agents
        if (!this.person_id || this.person_id.length == 0) {
            return new Promise.resolve(false);
        }
        // else
        return(
            // these agents must be persons (instead of groups)
            this.person_id.map(
                (id) => {
                    return Author.getCachedAuthor(id);
                }
            ).reduce(
                (chainPromises, nextPromise) => {
                    return chainPromises.then((person) => {
                        console.log("is not a person: "+ person.lastName +", "+ person.isNotAPerson);
                        isAPerson = isAPerson || !person.isNotAPerson;
                        return nextPromise;
                    });
                }
            ).then(
                () => {
                    return Promise.resolve(isAPerson);
                }
            )
        );
    }

    /*
    Parse a PerformancePerson and its linked resources 
    returns a thread of promises 
    */
    static parsePerformancePerson(iri, dasch) {
        if (iri in exports.PerformancePerson.cache) {
            return exports.PerformancePerson.cache[iri];
        }

        let prom = new Promise((resolve) => {
            dasch.getResource(
                iri,
                (json) => {
                    let person = new exports.PerformancePerson(json);
                    resolve(person);
                }
            );
        }
        ).then(
            (person) => {
                return person.getListsAndLinks(dasch).then(() => { return Promise.resolve(person); });
            }
        );

        exports.PerformancePerson.cache[iri] = prom;
        return prom;
    };

    static cache = {};

}
