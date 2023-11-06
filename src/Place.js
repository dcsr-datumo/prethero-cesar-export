const { DaSCH } = require("./lib/DaSCH.js");
const { DaSCHClass } = require("./lib/DaSCHClass.js");

exports.Place = class extends DaSCHClass {
    constructor(raw) {
        super(raw);

        try {
            this.name = raw["prethero:placeHasName"]["knora-api:valueAsString"];
        } catch (error) {
            this.name = undefined;
        }
        try {
            this.authorities = {
                "geonames": "https://www.geonames.org/" + raw["prethero:hasGeonamesId"]["knora-api:geonameValueAsGeonameCode"]
            }
        } catch (error) {
            this.authorities = undefined;
        }
        try {
            this.location_type_id = raw["prethero:placeHasType"]["knora-api:listValueAsListNode"]["@id"];
        } catch (error) {
            this.location_type_id = undefined;
        }
        try {
            this.parent_id = raw["prethero:placeIsPartOfValue"]["knora-api:linkValueHasTarget"]["@id"];
        } catch (error) {
            // this.parent_id = undefined;
        }
    }

    getListLink(dasch) {
        let promises = [];
        let thisPlace = this;
        if (this.location_type_id) {
            promises.push(
                new Promise((resolve, reject = (error) => { throw error; }) => {
                    dasch.getListNode(
                        thisPlace.location_type_id,
                        (data) => { thisPlace.location_type_id = data; resolve(thisPlace); },
                        reject
                    );
                })
            );
        }

        if (this.parent_id) {
            promises.push(
                exports.Place.parsePlaceRecursively(this.parent_id, dasch)
            );
        }

        return Promise.all(promises);
    }

    /*
        Parse a Place and its linked resources 
        returns a thread of promises 
    */
    static parsePlaceRecursively(iri, dasch) {
        if (iri in exports.Place.cache) {
            return exports.Place.cache[iri];
        }

        let prom = new Promise((resolve) => {
            dasch.getResource(
                iri,
                (json) => {
                    let place = new exports.Place(json);
                    resolve(place);
                }
            );
        }
        ).then(
            (place) => {
                return place.getListLink(dasch).then(() => {return Promise.resolve(place);} );
            }
        );

        exports.Place.cache[iri] = prom;
        return prom;
    };

    static parsePlaceRecursivelyFromPerformance(performance, dasch) {
        const property = "prethero:performanceHasPlaceValue";
        // throws error if not found
        const iri = DaSCH.getLinkTargetId(performance, property);
        return parsePlaceRecursively(iri, dasch);
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