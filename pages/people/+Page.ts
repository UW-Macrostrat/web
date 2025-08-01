import { Image, Navbar, Footer, SearchBar } from "~/components/general";
import h from "./main.module.sass";
import { Card, Divider } from "@blueprintjs/core";
import { useState, useEffect } from "react";
import { ContentPage } from "~/layouts";
import { fetchPGData } from "~/_utils";

export function Page() {
  const [input, setInput] = useState("");
  const [tags, setTags] = useState([]);

  const [res, setPeople] = useState([]);
  const [tagList, setTagList] = useState([]);

  useEffect(() => {
    fetchPGData("/people", { name: `ilike.*${input}*` })
      .then(setPeople)
      .catch((err) => {
        console.error("Failed to fetch people:", err);
      });
  }, [input]);

  useEffect(() => {
    fetchPGData("/roles", {})
      .then(data => setTagList(data.map(role => role.name)))
      .catch((err) => {
        console.error("Failed to fetch tags:", err);
      });
  }, []);

  if(!res || !tagList) {
    return h("div.loading", "Loading...");
  }

  const filteredPeople = res.filter((person) => {
    const name = person.name.toLowerCase();
    const role = person.roles.map(role => role.name).join(", ").toLowerCase();
    const email = person.email ? person.email.toLowerCase() : "";

    const roleTags = tagList
      .map((tag) => {
        if (role.includes(tag.toLowerCase())) {
          return tag;
        }
        return null;
      })
      .filter((tag) => tag !== null);
    const tagMatch =
      tags.length === 0 || tags.every((tag) => roleTags.includes(tag));

    return (
      (name.includes(input) || role.includes(input) || email.includes(input)) &&
      tagMatch
    );
  });

  return h("div", [
    h(Navbar),
    h(ContentPage, { className: "people-page" }, [
      h("div.page-header", [
        h("h1.big", "People"),
        h("p.subtitle", "major contributors to the project"),
        h(Divider),
      ]),
      h(Card, { className: "search-bar" }, [
        h(SearchBar, {
          onChange: (e) => setInput(e),
          placeholder: "Search by name, role, or email",
        }),
        h("div.tags", [
          tagList.map((tag) => {
            return h(
              "div",
              {
                onClick: () => {
                  setTags((prevTags) => {
                    if (prevTags.includes(tag)) {
                      return prevTags.filter((t) => t !== tag);
                    } else {
                      return [...prevTags, tag];
                    }
                  });
                },
                className: tags.includes(tag)
                  ? "filter-card selected"
                  : "filter-card",
              },
              tag
            );
          }),
        ]),
      ]),
      h("div.people", [
        filteredPeople.map((person) => {
          return h(PersonCard, person);
        }),
      ]),
    ]),
    h(Footer),
  ]);
}

function PersonCard({ name, roles, email, website, img_id }) {
  return h("div.person-info", [
    h(Image, { src: img_id, className: "back-img" }),
    h("div.description", [
      h("a.name", { href: website }, name),
      h("p.role", roles.map(role => role.name).join(", ")),
      h.if(email)("a.email", { href: "mailto: " + email }, email),
    ]),
  ]);
}
