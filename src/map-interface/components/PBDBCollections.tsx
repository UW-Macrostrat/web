import React from "react";
import { Divider, Tabs, Tab } from "@blueprintjs/core";
import { makeOccurrenceTree } from "../utils";
import h from "@macrostrat/hyper";

function InfoPanel(props) {
  const { col } = props;

  return (
    <div>
      {col.nam && (
        <div className="map-source-attr">
          <span className="attr">Name: </span> {col.nam}
        </div>
      )}
      {col.oid && (
        <div className="map-source-attr">
          <span className="attr">Collection no.: </span>{" "}
          <a
            href={`https://paleobiodb.org/classic/basicCollectionSearch?collection_no=${col.oid.replace(
              "col:",
              ""
            )}`}
            target="_blank"
          >
            {col.oid.replace("col:", "")}
          </a>
        </div>
      )}
      {col.oei && (
        <div className="map-source-attr">
          <span className="attr">Age: </span> {col.oei} ({col.lag} - {col.lag}
          <span className="age-chip-ma">Ma</span>)
        </div>
      )}
      {col.sgr && (
        <div className="map-source-attr">
          <span className="attr">Group: </span> {col.sgr}
        </div>
      )}
      {col.sfm && (
        <div className="map-source-attr">
          <span className="attr">Formation: </span> {col.sfm}
        </div>
      )}
      {col.lt1 && (
        <div className="map-source-attr">
          <span className="attr">Lithology: </span> {col.la1 ? col.la1 : ""}{" "}
          {col.lf1 ? col.lf1 : ""} {col.lt1.replace('"', "")}{" "}
          {col.lt2 ? ", " : ""}
          {col.la2 ? col.la2 : ""} {col.lf2 ? col.lf2 : ""} {col.lt2}
        </div>
      )}
      {col.env && (
        <div className="map-source-attr">
          <span className="attr">Environment: </span> {col.env}
        </div>
      )}
      {col.ref && (
        <div className="reference map-source-attr">
          <span className="attr">Reference: </span>{" "}
          <span dangerouslySetInnerHTML={{ __html: col.ref }}></span>
        </div>
      )}
    </div>
  );
}

function OccurancesPanel(props) {
  const { occurrenceTree } = props;

  return (
    <div>
      <ul className="taxon-list phylum-list">
        {occurrenceTree.phyla.map((phylum, pidx) => {
          return (
            <div key={pidx} className="phyla">
              <li>{phylum.phylum}</li>
              <ul className="taxon-list">
                {phylum.classes.map((cls, clsidx) => {
                  return (
                    <div key={clsidx} className="classes">
                      <li>{cls.nameClass}</li>
                      <ul className="taxon-list">
                        {cls.families.map((family, familyidx) => {
                          return (
                            <div key={familyidx} className="families">
                              <li>{family.family}</li>
                              <ul className="taxon-list genera">
                                {family.genera.map((genus, genusidx) => {
                                  return (
                                    <li key={genusidx}>
                                      {genus.old_name
                                        ? '"' + genus.old_name + '" - '
                                        : ""}
                                      {genus.genusRes ? genus.genusRes : " "}
                                      {genus.display_name1}
                                      <i>
                                        {genus.display_name2
                                          ? genus.display_name2
                                          : ""}
                                        {genus.display_name3
                                          ? genus.display_name3
                                          : ""}
                                      </i>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </ul>
    </div>
  );
}

function PBDBCollections(props) {
  let collections = props.data.map((col, idx) => {
    const isLast = idx == props.data.length - 1;
    let occurrenceTree = makeOccurrenceTree(col.occurrences);

    return (
      <div key={idx} style={{ marginBottom: "10px" }}>
        <Tabs animate={true} id={idx}>
          <Tab
            title="Info"
            panel={<InfoPanel col={col} />}
            id="info"
            style={{ fontSize: "20px" }}
          />
          <Tab
            style={{ fontSize: "20px" }}
            id="occ"
            title={`Occurrences (${col.occurrences.length})`}
            disabled={col.occurrences.length ? false : true}
            panel={<OccurancesPanel occurrenceTree={occurrenceTree} />}
          />
        </Tabs>
        {h.if(!isLast)(Divider)}
      </div>
    );
  });

  return <div>{props.data && collections}</div>;
}

export default PBDBCollections;
