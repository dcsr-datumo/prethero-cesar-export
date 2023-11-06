const { ThingPerformed } = require("./ThingPerformed.js");
const { Place } = require("./Place.js");
const { PerformancePerson } = require("./PerformancePerson.js");
const { DaSCH } = require("./lib/DaSCH.js");
const { DaSCHClass } = require("./lib/DaSCHClass.js");

exports.Performance = class extends DaSCHClass {
    // creator from the json returned by a request on preformances
    // (as opposed as a get resource call) 
    constructor(raw) {
        super(raw);

        this.title = raw["rdfs:label"];
        this.language_id = raw["prethero:hasLanguage"];
    }

    parse(DaSCH_data) {
        try {
            this.dates = DaSCH.getDate(DaSCH_data, "prethero:performanceHasDate");
        } catch (error) {
            // no date?            
        }
        // more than date?
    }

    parseListsAndLinks(data, dasch) {
        let performance = this;
        this.parse(data);
        let nextReqs = [];
        // [this.parseScript, this.parsePlace, this.parsePersons].map(
        return [this.parseScript, this.parsePlace, this.parsePersons].map(
            (parser) => {
                try {
                    return parser.bind(performance)(data, dasch);
                } catch (error) {
                    // no script, place or persons
                    // log("Performance.parseListsAndLinks: ", error,", perf: ", performance, ", data: "+ data);
                }
            }
        ).reduce(
            (chainPromises, nextPromise) => {
                return chainPromises.then(() => {
                    return nextPromise;
                });
            },
            Promise.resolve() // init value is usefull if there is no script, place and person
        );
    }

    parseScript(data, dasch) {
        const property = "prethero:isPerformanceOfValue";
        var performance = this;
        // throws error if not found
        this.script_id = DaSCH.getLinkTargetId(data, property);
        const scriptsReqs = performance.script_id.map(
            (iri) => {
                return ThingPerformed.parseThingPerformed(iri, dasch);
            }
        );
        return Promise.all(placesReqs); // is it needed?

    }

    /*
        parse Place basic information from the resource (no further graph exploration)
        returns the Performance linked the place
    */
    parsePlace(data, dasch) {
        const property = "prethero:performanceHasPlaceValue";
        var performance = this;
        // throws error if not found
        performance.location_id = DaSCH.getLinkTargetId(data, property);
        const placesReqs = performance.location_id.map(
            (placeIri) => {
                return Place.parsePlaceRecursively(placeIri, dasch);
            }
        );
        return Promise.all(placesReqs); // is it needed?
    }

    parsePersons(data, dasch) {
        const property = "prethero:consistsOfValue";
        let performance = this;
        let performance_person_ids = DaSCH.getLinkTargetId(data, property);
        performance.performance_person_ids = performance_person_ids; 
        if (performance_person_ids) {
            this.performance_person_id = [];
            // build requests for all linked
            const allPersonsReq = performance_person_ids.map(
                (id) => {
                    return PerformancePerson.parsePerformancePerson(id, dasch)
                        .then(
                            (performance_person) => { return performance_person.isAttachedToAPerson(); }
                        )
                        .then(
                            (isAttachedToAPerson) => {
                                if (isAttachedToAPerson) {
                                    performance.performance_person_id.push(performance_person.id);
                                }
                            }
                        );
                }
            );
            return Promise.all(allPersonsReq); // there it should be needed
        }
    }

}
