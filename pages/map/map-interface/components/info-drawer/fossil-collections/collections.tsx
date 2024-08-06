import React from "react";
import { Tabs, Tab } from "@blueprintjs/core";
import { makeOccurrenceTree } from "../../../utils";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
const h = hyper.styled(styles);

export default function PBDBCollections({ data }) {
  if (data == null) return null;
  return h(
    "div.collections",
    data.map((col, ix) => h(FossilCollection, { key: ix, col }))
  );
}

function FossilCollection({ col }) {
  let occurrenceTree = makeOccurrenceTree(col.occurrences);
  return h(
    "div.fossil-collection",
    <>
      <Header col={col} />
      <Tabs>
        <Tab title="Info" panel={<InfoPanel col={col} />} id="info" />
        <Tab
          id="occ"
          title={`Occurrences (${col.occurrences.length})`}
          disabled={col.occurrences.length == 0}
          panel={<OccurencesPanel occurrenceTree={occurrenceTree} />}
        />
      </Tabs>
    </>
  );
}

function CollectionNumber({ col }) {
  const num = col.oid.replace("col:", "");
  return h("div.collection-number", [
    h("span.collection-number-prefix", "#"),
    h(
      "a",
      {
        href: `https://paleobiodb.org/classic/basicCollectionSearch?collection_no=${num}`,
        target: "_blank",
      },
      num
    ),
  ]);
}

function Header({ col }) {
  return h("div.pbdb-panel-header", [
    h.if(col.nam)("h4", {}, col.nam),
    h.if(col.oid)(CollectionNumber, { col }),
  ]);
}

function InfoPanel(props) {
  const { col } = props;

  return (
    <div>
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

function OccurencesPanel(props) {
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
