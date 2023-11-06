const { DaSCH } = require("./lib/DaSCH.js");
const { DaSCHClass } = require("./lib/DaSCHClass.js");
const { Place } = require("./Place.js");
const { Author } = require("./Author.js");

class Carrier extends DaSCHClass {
    #type;

    /*
    */
    constructor(raw) {
        super(raw);

        this.#type = raw["@type"];

        try {
            this.library_id = DaSCH.getListNodeId(raw, "prethero:hasHoldingInstitution");
        } catch (error) {
            //
        }

        // cardinality 0-1
        try {
            this.call_number = raw["prethero:hasShelfmark"]["knora-api:valueAsString"];
        } catch (error) {
            this.call_number = undefined;
        }

        // cardinality 0-1
        try {
            [this.start, this.end] = DaSCH.getDate(raw, "prethero:hasWritingDate");
        } catch (error) {
            // no birth date
        }

        // cardinality 0-1
        try {
            this.title = DaSCH.concatStringValues(
                raw,
                (this.#type == "prethero:PlayCarrierPrinted" ?
                    "prethero:sourcePrimaryPrintedHasMainTitle" :
                    "prethero:sourcePrimaryHasIncipit"),
                ", "
            );
        } catch (error) {
            //
        }

        try {
            this.subtitle = DaSCH.concatStringValues(raw, "prethero:sourcePrimaryPrintedHasSubtitle", ", ");
        } catch (error) {
            //
        }

        // cardinality 0-n
        this.authorities = [];
        ["prethero:hasAuthorityFile", "prethero:playCarrierPrintedHasAuthorityFile"].map(
            (property) => {
                try {
                    this.authorities.push(...DaSCH.values(raw, property));
                } catch (error) {
                    // no such property
                }
            }
        )
        this.authorities = DaSCH.nameAuthorities(this.authorities);

        // cardinality 0-n :(
        try {
            const digitised = DaSCH.values(raw, "prethero:hasDigitisedDocument");
            this.authorities.push({"digitised": digitised});
        } catch (error) {
            // none found
        }

        // clean-up if none found
        if (this.authorities.length == 0) {
            delete this.authorities;
        }

        // printer : hasPrinter 0-n
        try {
            this.publisher_id = DaSCH.arrayfy(DaSCH.getLinkTargetId(raw, "prethero:hasPrinterValue"));
        } catch (error) {
            //
        }

        try {
            this.location_id = DaSCH.getLinkTargetId(raw, "prethero:hasPrintingPlaceValue");
        } catch (error) {
            //
        }

        try {
            let dates = DaSCH.getDate(raw, "prethero:hasPrintingDate").pop();
            this.start = dates.start;
            this.end = dates.end;
        } catch (error) {
            // no date?            
        }

        try {
            this.genre = DaSCH.concatStringValues(raw, "prethero:hasLiteraryGenreTranscribed", ", ");
        } catch (error) {
            //
        }
    }

    getListAndLinks(dasch) {
        let promises = [];
        // lists
        if (this.library_id) {
            promises.push(
                new Promise((resolve, reject = (error) => { throw error; }) => {
                    dasch.getListNode(
                        this.library_id,
                        (data) => { this.library_id = data; resolve(data); },
                        reject
                    );
                })
            );
        }

        // links
        if (this.publisher_id) {
            for (const publisher_id of this.publisher_id) {
                promises.push(Author.getAuthor(publisher_id, dasch)
                    .then(
                        (publisher) => {
                            publisher.membership = { "activity": "imprimeur" };
                            try {
                                publisher.name = publisher.lastname + ", " + publisher.firstname;
                            } catch (error) {
                                //
                            }
                        }
                    )
                )
            }
        }

        // links
        if (this.location_id) {
            for (const location_id of this.location_id) {
                promises.push(Place.parsePlaceRecursively(this.location_id, dasch));
            }
        }

        promises.push(Promise.resolve(this));

        // sync back all promises
        return promises.reduce(
            (chainPromises, nextPromise) => {
                return chainPromises.then(() => {
                    return nextPromise;
                });
            }
        );
    }

    getType() {
        return this.#type;
    }

    static getCarrier(iri, dasch) {
        if (iri in exports.Carrier.cache) {
            return exports.Carrier.cache[iri];
        }

        let prom = new Promise((resolve) => {
            dasch.getResource(iri, (data) => {
                resolve(new exports.Carrier(data));
            });
        }).then(
            (carrier) => {
                return carrier.getListAndLinks(dasch).then(() => { return Promise.resolve(carrier); });
            }
        );

        exports.Carrier.cache[iri] = prom;
        return prom;
    }

    static cache = {};
}

exports.Carrier = Carrier;