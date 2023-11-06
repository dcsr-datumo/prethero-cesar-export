const { DaSCH } = require("./lib/DaSCH.js");
const { DaSCHClass } = require("./lib/DaSCHClass.js");
const { Place } = require("./Place.js");

class Author extends DaSCHClass {
    #isNotAPerson;

    /*

    +- hasPlaceOfOrigin : link
    + personHasTitle
    + hasBirthDate
    + hasDeathDate
    +- hasGender : list 
    + hasFirstName
    + hasLastName
    + hasPseudonym
    + personHasAuthorityFile
    + prethero_iri
    - hasActivityType : list
    */
    constructor(raw) {
        super(raw);

        console.log("parsing: ", this.sources);

        this.#isNotAPerson = false;
        if (raw["@type"] != "prethero:HistoricPerson") {
            this.#isNotAPerson = true;
            return;
        }

        // nationality
        try {
            this.nationality_id = DaSCH.getLinkTargetId(raw, "prethero:hasPlaceOfOriginValue");
        } catch (error) {
            this.nationality_id = undefined;
        }

        // lastname
        try {
            this.lastname = DaSCH.concatStringValues(raw, "prethero:hasLastName", ", ");
        } catch (error) {
            this.lastname = undefined;
        }

        // title
        try {
            const titles = DaSCH.concatStringValues(raw, "prethero:personHasTitle", ", ");
            if (titles) {
                this.social_title_id =
                    (this.lastname ? this.lastname + ", " : "") +
                    titles;
            }
        } catch (error) {
            // this.social_title_id = undefined;
        }

        // firstname
        try {
            this.firstname = DaSCH.concatStringValues(raw, "prethero:hasFirstName", ", ");
        } catch (error) {
            this.firstname = undefined;
        }

        // hasPseudonym
        try {
            this.pseudonym = DaSCH.concatStringValues(raw, "prethero:hasPseudonym", ", ");
        } catch (error) {
            // this.pseudonym = undefined;
        }

        // birth cardinality 0-1
        try {
            const date = DaSCH.getDate(raw, "prethero:hasBirthDate").pop();
            this.birth_min = date.start;
            this.birth_max = date.end;
        } catch (error) {
            // no birth date
        }

        // death cardinality 0-1
        try {
            const date = DaSCH.getDate(raw, "prethero:hasDeathDate").pop();
            this.death_min = date.start;
            this.death_max = date.end;
        } catch (error) {
            // no death date
        }

        try {
            this.gender_id = DaSCH.getListNodeId(raw, "prethero:hasGender");
        } catch (error) {
            // no gender
        }

        // personHasAuthorityFile
        try {
            let candidate = raw["prethero:personHasAuthorityFile"];
            if (candidate) {
                if (candidate instanceof Array) {
                    this.authorities = candidate.map(i => i["knora-api:uriValueAsUri"]["@value"]);
                } else {
                    this.authorities = [];
                    this.authorities.push(candidate["knora-api:uriValueAsUri"]["@value"]);
                }
                this.authorities = DaSCH.nameAuthorities(this.authorities);
            }
        } catch (error) {
            this.authorities = undefined;
        }

        // prethero:hasActivityType
        try {
            this.skill_id = DaSCH.getListNodeId(raw, "prethero:hasActivityType");
        } catch (error) {
            //
        }

        // not used in prethero
        // try {
        //     this.membership_id = DaSCH.getLinkTargetId(raw, "prethero:hasMembershipValue");
        // } catch (error) {
        //     this.language_id = undefined;
        // }
    }

    getListAndLinks(dasch) {
        let promises = [];
        let thisAuthor = this;
        // link
        if (this.nationality_id) {
            promises.push(Place.parsePlaceRecursively(this.nationality_id, dasch));
        }
        // lists
        if (this.gender_id) {
            promises.push(
                new Promise((resolve, reject = (error) => { throw error; }) => {
                    dasch.getListNode(
                        this.gender_id,
                        (data) => { this.gender_id = data; resolve(data); },
                        reject
                    );
                })
            );
        }
        if (this.skill_id) {
            promises.push(
                this.skill_id.map(
                    (iri) => {
                        return new Promise((resolve, reject = (error) => { throw error; }) => {
                            dasch.getListNode(
                                iri,
                                (data) => { this.skill_id.push(data); resolve(data); },
                                reject
                            );
                        })
                    }
                )
            );
            this.skill_id = [];
        }
        // not used in prethero
        // if (this.membership_id) {
        //     promises.push(
        //         new Promise(
        //         (resolve) => {
        //             dasch.getResource(id, (data) => {
        //                 this.membership_id = new Group(data);
        //                 resolve();
        //             })
        //         })
        //     );
        // }

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

    static cache = {};

    static getAuthor(iri, dasch) {
        if (iri in Author.cache) {
            return Author.cache[iri];
        }

        let promise = new Promise((resolve) => {
            dasch.getResource(iri, (data) => {
                resolve(new exports.Author(data));
            });
        }).then(
            (author) => {
                // if not a HistoricalPerson, don't bother exploring the graph
                if (author.#isNotAPerson) {
                    return author;
                }
                return author.getListAndLinks(dasch);
            }
        );

        Author.cache[iri] = promise;
        return promise;
    }

    static getCachedAuthor(iri) {
        if (iri in Author.cache) {
            return Author.cache[iri];
        } else {
            return null;
        }
    }
}

exports.Author = Author;