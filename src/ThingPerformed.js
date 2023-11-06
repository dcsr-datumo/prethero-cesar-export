const { DaSCH } = require("./lib/DaSCH.js");
const { DaSCHClass } = require("./lib/DaSCHClass.js");
const { Author } = require("./Author.js");
const { Carrier } = require("./Carrier.js");

exports.ThingPerformed = class extends DaSCHClass {

    constructor(raw) {
        super(raw);
        
        this.title = raw["rdfs:label"];
        try {
            // language is optionnal
            this.language_id = DaSCH.getListNodeId(raw, "prethero:hasLanguage");
        } catch (error) {
            // this.language_id = undefined;
        }
        try {
            // type of performance
            this.qualifier_id = DaSCH.getListNodeId(raw, "prethero:thingPerformedHasType");
        } catch (error) {
            // this.qualifier_id = undefined;
        }
        try {
            // author
            this.author_id = DaSCH.getLinkTargetId(raw, "prethero:thingPerformedHasAuthorValue");
        } catch (error) {
            // this.author_id = undefined;
        }
        // if we are a WorkPlayed (subclass of ThingPerformed)
        // we might have a property `prethero:workIsCarriedBy`
        try {
            // carried by
            this.manuscript_id = DaSCH.getLinkTargetId(raw, "prethero:workIsCarriedByValue");
        } catch (error) {
            // this.manuscript_id = undefined;
        }
    }

    getListsAndLinks(dasch) {
        let promises = [];

        if (this.language_id) {
            promises.push(
                new Promise((resolve, reject = (error) => { throw error; }) => {
                    dasch.getListNode(
                        this.language_id,
                        (data) => { this.language_id = data; resolve(data); },
                        reject
                    );
                })
            );
        }

        if (this.qualifier_id) {
            promises.push(
                this.qualifier_id.map(
                    (iri) => {
                        new Promise((resolve, reject = (error) => { throw error; }) => {
                            dasch.getListNode(
                                iri,
                                (data) => { this.qualifier_id.push(data); resolve(data); },
                                reject
                            );
                        })
                    }
                )
            );
            this.qualifier_id = [];
        }

        if (this.author_id) {
            promises.push(Author.getAuthor(this.author_id, dasch));
        }

        if (this.manuscript_id) {
            this.manuscript_id.map(
                (id) => {
                    promises.push(
                        Carrier.getCarrier(id, dasch)
                        .then(
                            (carrier) => {
                                let category = (carrier.getType() == "prethero:PlayCarrierPrinted" ? "publication_id" : "manuscript_id");
                                 if (!this[category]) { this[category] = []; }
                                this[category].push(id);
                            }
                        )
                    );
                }
            );
            delete this.manuscript_id;
        }

        return promises.reduce((chainPromises, nextPromise) => {
            return chainPromises.then(() => {
                return nextPromise;
            });
        }, Promise.resolve());
    }

    static parseThingPerformed(iri, dasch) {
        if (iri in exports.ThingPerformed.cache) {
            return exports.ThingPerformed.cache[iri];
        }

        let thingPerformed;
        exports.ThingPerformed.cache[iri] = new Promise((resolve) => {
            dasch.getResource(iri, (script) => {
                thingPerformed = new exports.ThingPerformed(script);
                resolve(thingPerformed);
            })

        }
        ).then(
            (script) => {
                return script.getListsAndLinks(dasch).then(() => {return Promise.resolve(script);});
            }
        );

        return exports.ThingPerformed.cache[iri];
    }

    static cache = {};

    /*
    "prethero:hasLanguage": {
        "@id": "http://rdfh.ch/0119/PJz5T14NTrKdj5J6b_kXZQ/values/iIfuo5hYSGebSuYm_19vxA",
        "knora-api:listValueAsListNode": {
            "@id": "http://rdfh.ch/lists/0119/Qjs18-xrSXW_ygis2yR1iA"
        },
    }
    */

}