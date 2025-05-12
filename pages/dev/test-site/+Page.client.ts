import { Image, Navbar, Footer } from "./index";
import "./main.sass";
import "./main.styl";
import h from "@macrostrat/hyper";

export function Page() {
    return h('div.total', [
        h(Navbar),

        h('div.start', {}, [
            h(Image, { className: "back-img cover-image", src: 'cover_large.jpg' }),
            h('div.text', {}, [
              h('span.header', {}, [
                  h('h1#main-title', [
                    'Macrostrat',
                    h('h2.version','v2')
                  ])
              ]),
              h('div.stats', {}, [
                  h('div.stat', {}, [
                  h('span.top-stat#n_columns', {}, '1,400'),
                  h('span.top-stat-label', {}, 'Regional Rock Columns')
                  ]),
                  h('div.stat', {}, [
                  h('span.top-stat#n_units', {}, '33,903'),
                  h('span.top-stat-label', {}, 'Rock Units')
                  ]),
                  h('div.stat', {}, [
                  h('span.top-stat#n_polys', {}, '2,500,000'),
                  h('span.top-stat-label', {}, 'Geologic Map Polygons')
                  ]),
                  h('div.stat', {}, [
                  h('span.top-stat#n_names', {}, '51,212'),
                  h('span.top-stat-label', {}, 
                      h('a', { href: 'Macrostrat_strat_names.html', target: '_blank' }, 'Stratigraphic Names')
                  )
                  ])
              ]),
              h('p.big-text', {}, 'A platform for geological data exploration, integration, and analysis'),
              h('div.buttons1', {}, [
                  h('a.btn', { href: '/sift/#/' }, 'Search'),
                  h('a.btn', { href: '/map/#3/40.78/-94.13' }, 'Geologic Map'),
                  h('div.btn.rockd', { onclick: () => window.location = 'https://rockd.org' }, [
                  h('div.rockd-button-container', {}, [
                      h(Image, { className: "rockd-png", src: 'rockd.jpg', width: '22px' }),
                      h('a', { href: 'https://rockd.org', target: '_blank' }, 'Go mobile')
                  ])
                  ])
              ])
            ])
        ]),

        h('div#locations', {}, [
            h('div.location', {}, [
            h(Image, { className: "location-img t1", src: 'north_america_med.jpg' }),
            h('div.location-text', {}, [
                h('h1', {}, 'North America'),
                h('div.caption', {}, '243 packages. 798 units. 897 collections.')
            ]),
            h(Image, { className: "location-img t2", src: 'caribbean_new_medium.jpg' }),
            h('div.location-text', {}, [
                h('h1', {}, 'Caribbean'),
                h('div.caption', {}, '243 packages. 798 units. 897 collections.')
            ])
            ]),
            h('div.location', {}, [
            h('div.location-text', {}, [
                h('h1', {}, 'New Zealand'),
                h('div.caption', {}, '828 packages. 2,168 units. 328 collections.')
            ]),
            h(Image, { className: "location-img t1", src: 'new_zealand_new_medium.jpg' }),
            h('div.location-text', {}, [
                h('h1', {}, 'Deep Sea'),
                h('div.caption', {}, '388 packages. 7,124 units. 0 collections.')
            ]),
            h(Image, { className: "location-img t2", src: 'deep_sea_new_medium.jpg' })
            ])
        ]),

        h('div.temp-class#map', {}, [
            h('div.link-title', {}, [
            h('a', { href: '/map' }, h('h1', {}, 'Map Interface'))
            ]),
            h('p.long', {}, [
            h('div.temp', {}, [
                'With over 225 maps from data providers around the world across every scale, Macrostrat is the world\'s largest homogenized geologic map database. Our data processing pipeline links geologic map polygons to Macrostrat column polygons, external stratigraphic name lexicons, and geochronological intervals, enabling the enhancement of the original map data and allowing for direct links into ',
                h('a', { href: 'https://xdd.wisc.edu', target: '_blank' }, 'xDD'),
                ' (formly GeoDeepDive).'
            ]),
            h('div.temp', {}, [
                'Are you affiliated with a state or national geologic survey? ',
                h('a', { href: 'mailto:contact@macrostrat.org?Subject=Geologic%20Map%20Collaboration' }, 'Get in touch'),
                ' with us - we\'d love to collaborate and help publicize your maps!'
            ]),
            h('div.temp', {}, [
                'Get started by ',
                h('a', { href: '/map' }, 'exploring the map'),
                ' or ',
                h('a', { href: '/map/sources' }, 'taking a look at'),
                ' which maps are currently a part of Macrostrat.'
            ])
            ])
        ]),

        h('div.temp-class#maps', {}, [
            h('div.link-title', {}, [
            h('a', { href: '/maps' }, h('h1', {}, 'Maps'))
            ]),
            h('p', {}, 'The spatial footprint of rocks on the Earth\'s surface')
        ]),

        h('div.temp-class#columns', {}, [
            h('div.link-title', {}, [
            h('a', { href: '/columns' }, h('h1', {}, 'Columns'))
            ]),
            h('p', {}, 'Stratigraphic and geological columns showing the organization of rocks in time')
        ]),

        Lexicon,
        Projects,
        Donate,
        h(Footer),
    ])
}


const Lexicon = 
  h('div.temp-class#lexicon', {}, [
    h('div.link-title', {}, [
      h('a', { href: '/lex' }, h('h1', {}, 'Geologic Lexicon'))
    ]),
    h('p', {}, 'Geologic units and data dictionaries')
  ]);

const Projects = 
  h('div.temp-class#project', {}, [
    h('div.link-title', {}, [
      h('a', { href: '/projects' }, h('h1', {}, 'Projects'))
    ]),
    h('p', {}, 'Projects for specific regions or geological problems')
  ]);

const Donate = 
  h('div.donate-container#donate', {}, [
    h(Image, { className: "back-img donate-img", src: 'donate_medium.jpg' }),
    h('div.text-donate', {}, [
      h('div.donate-left', {}, [
        h('h1.title.donate-title', {}, [
          h('a', { href: 'https://secure.supportuw.org/give/?id=E0A03FA3-B2A0-431C-83EE-A121A04EEB5D', target: '_blank' }, 'Donate Now')
        ])
      ]),
      h('div.donate-right', {}, [
        h('div.donate-info', {}, [
          'Grant funding, principally from the ',
          h('a', { href: 'http://www.nsf.gov', target: '_blank' }, 'U.S. National Science Foundation'),
          ', got Macrostrat off the ground and keeps us innovating, but maintaining and growing a free and open digital resource involves ongoing expenses beyond the grant cycle, like annual certificate renewals, cloud server hosting and backup storage that keep your connection safe, domain name registrations that keep us located on the web, and system upgrades to keep us fast and efficient. If you would like to help us continue to grow and provide free resources, you can do so with a one-time or recurring gift to the UW Foundation Paleontology Program Fund in Geology. Thank you!'
        ])
      ])
    ])
  ]);
