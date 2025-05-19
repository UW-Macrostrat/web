import { PageHeader } from "~/components";
import { PageBreadcrumbs } from "~/components";
import { Image, Navbar, Footer } from "../index";
import "./main.styl";
import "../main.styl";
import { MacrostratIcon } from "~/components";
import { h } from "@macrostrat/map-interface";

export function Page() {
    const res = [
    {
        "name": "Shanan Peters",
        "role": "Professor, Database Developer",
        "email": "peters@geology.wisc.edu",
        "link": "http://strata.geology.wisc.edu",
        "image": "shanan.jpg"
    },
    {
        "name": "Daven Quinn",
        "role": "Research Scientist, Developer",
        "email": "daven.quinn@wisc.edu",
        "link": "https://davenquinn.com",
        "image": "daven.jpg"
    },
    {
        "name": "Evgeny Mazko",
        "role": "Graduate Student",
        "email": "mazko@wisc.edu",
        "link": null,
        "image": "evgeny.jpg"
    },
    {
        "name": "Michael McClennen",
        "role": "Senior Programmer Analyst",
        "email": "mmcclenn@geology.wisc.edu",
        "link": "https://geoscience.wisc.edu/geoscience/people/staff/name/michael-mcclennen/",
        "image": "michael.jpg"
    },
    {
        "name": "Casey Idzikowski",
        "role": "Research Specialist, Developer (former)",
        "email": null,
        "link": "https://idzikowski-casey.github.io/personal-site/",
        "image": "casey.jpg"
    },
    {
        "name": "David Sklar",
        "role": "Undergraduate Research Assistant",
        "email": "dsklar@wisc.edu",
        "link": null,
        "image": "david.jpg"
    },
    {
        "name": "Amy Fromandi",
        "role": null,
        "email": "punkish@eidesis.org",
        "link": null,
        "image": "amy.jpg"
    },
    {
        "name": "Daniel Segessenmen",
        "role": "Graduate Student (former)",
        "email": null,
        "link": "http://strata.geology.wisc.edu",
        "image": "daniel.jpg"
    },
    {
        "name": "Shan Ye",
        "role": "Graduate Student (former)",
        "email": null,
        "link": "https://www.wisc.edu/directories/person.php?name=Victoria+Khoo&email=vkhoo%40wisc.edu&query=victoria%20khoo",
        "image": "shan.jpg"
    },
    {
        "name": "Ben Linzmeier",
        "role": "Postdoctoral Scholar (former)",
        "email": null,
        "link": "http://strata.geology.wisc.edu",
        "image": "ben.jpg"
    },
    {
        "name": "Afiqah Rafi",
        "role": "Undergrad Student (former)",
        "email": null,
        "link": "https://www.wisc.edu/directories/person.php?name=Victoria+Khoo&email=vkhoo%40wisc.edu&query=victoria%20khoo",
        "image": "afiqah.jpg"
    },
    {
        "name": "Sharon McMullen",
        "role": "Researcher (former)",
        "email": null,
        "link": "http://geoscience.wisc.edu/geoscience/people/student/?id=1007",
        "image": "sharon.jpg"
    },
    {
        "name": "Andrew Zaffos",
        "role": "Data Mobilization and Research Scientist",
        "email": "azaffos@email.arizona.edu",
        "link": "http://www.azstrata.org",
        "image": "andrew.jpg"
    },
    {
        "name": "Jon Husson",
        "role": "Postdoctoral Researcher (former)",
        "email": "jhusson@uvic.ca",
        "link": "http://www.jonhusson.com",
        "image": "jon.jpg"
    }
]



    return h('div.main', [
        h(Navbar),
        h('h1.big', "People"),
        h('p.subtitle', "major contributors to the project"),
        h('div.line'),
        h('div.people', [
            res.map(person => {
                return h(PersonCard, person);
            })
        ]),
        h(Footer)
    ])
}

function PersonCard({ name, role, email, link, image }) {
    return h('div.person-info', [
        h(Image, { src: image, className: "back-img" }),
        h('div.description', [
            h('a.name', { href: link }, name),
            role ? h('p.role', role) : null,
            email ? h('a.email', { href: "mailto: " + email}, email) : null,
        ]),
    ]);
}