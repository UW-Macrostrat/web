import { Image, Navbar, Footer, SearchBar } from "../index";
import h from "./main.module.sass";
import { Card, Divider } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";

export function Page() {
  const [input, setInput] = useState("");
  const [tags, setTags] = useState([]);
  const res = [
    {
      name: "Shanan Peters",
      role: "Professor, Database Developer",
      email: "peters@geology.wisc.edu",
      link: "http://strata.geology.wisc.edu",
      image: "shanan.jpg",
    },
    {
      name: "Daven Quinn",
      role: "Research Scientist, Developer",
      email: "daven.quinn@wisc.edu",
      link: "https://davenquinn.com",
      image: "daven.jpg",
    },
    {
      name: "Evgeny Mazko",
      role: "Graduate Student",
      email: "mazko@wisc.edu",
      link: null,
      image: "evgeny.jpg",
    },
    {
      name: "Michael McClennen",
      role: "Senior Programmer Analyst",
      email: "mmcclenn@geology.wisc.edu",
      link: "https://geoscience.wisc.edu/geoscience/people/staff/name/michael-mcclennen/",
      image: "michael.jpg",
    },
    {
      name: "Casey Idzikowski",
      role: "Research Specialist, Developer (former)",
      email: null,
      link: "https://idzikowski-casey.github.io/personal-site/",
      image: "casey.jpg",
    },
    {
      name: "David Sklar",
      role: "Undergrad Student",
      email: "dsklar@wisc.edu",
      link: null,
      image: "david.jpg",
    },
    {
      name: "Amy Fromandi",
      role: null,
      email: "punkish@eidesis.org",
      link: null,
      image: "amy.jpg",
    },
    {
      name: "Daniel Segessenmen",
      role: "Graduate Student (former)",
      email: null,
      link: "http://strata.geology.wisc.edu",
      image: "daniel.jpg",
    },
    {
      name: "Shan Ye",
      role: "Graduate Student (former)",
      email: null,
      link: "https://www.wisc.edu/directories/person.php?name=Victoria+Khoo&email=vkhoo%40wisc.edu&query=victoria%20khoo",
      image: "shan.jpg",
    },
    {
      name: "Ben Linzmeier",
      role: "Postdoctoral Scholar (former)",
      email: null,
      link: "http://strata.geology.wisc.edu",
      image: "ben.jpg",
    },
    {
      name: "Afiqah Rafi",
      role: "Undergrad Student (former)",
      email: null,
      link: "https://www.wisc.edu/directories/person.php?name=Victoria+Khoo&email=vkhoo%40wisc.edu&query=victoria%20khoo",
      image: "afiqah.jpg",
    },
    {
      name: "Sharon McMullen",
      role: "Researcher (former)",
      email: null,
      link: "http://geoscience.wisc.edu/geoscience/people/student/?id=1007",
      image: "sharon.jpg",
    },
    {
      name: "Andrew Zaffos",
      role: "Data Mobilization and Research Scientist",
      email: "azaffos@email.arizona.edu",
      link: "http://www.azstrata.org",
      image: "andrew.jpg",
    },
    {
      name: "Jon Husson",
      role: "Postdoctoral Researcher (former)",
      email: "jhusson@uvic.ca",
      link: "http://www.jonhusson.com",
      image: "jon.jpg",
    },
  ];

  console.log(tags);

  const tagList = [
    "Student",
    "Researcher",
    "Developer",
    "Postdoc",
    "Research Scientist",
    "Former",
  ];

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
  };

  const filteredPeople = res.filter((person) => {
    const name = person.name.toLowerCase();
    const role = person.role ? person.role.toLowerCase() : "";
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
          onChange: handleInputChange,
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

function PersonCard({ name, role, email, link, image }) {
  return h("div.person-info", [
    h(Image, { src: image, className: "back-img" }),
    h("div.description", [
      h("a.name", { href: link }, name),
      role ? h("p.role", role) : null,
      email ? h("a.email", { href: "mailto: " + email }, email) : null,
    ]),
  ]);
}
