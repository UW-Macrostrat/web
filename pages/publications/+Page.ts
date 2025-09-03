import { Navbar, Footer } from "~/components/general";
import { Divider } from "@blueprintjs/core";
import h from "./main.module.sass";
import { ContentPage } from "~/layouts";

export function Page() {
  return h("div.container", [
    h(Navbar),

    h(ContentPage, [
      h("h1.pub-title", "Publications"),
      h("p.blurb", "literature utilizing Macrostrat"),
      h(Divider, { className: "divider" }),
      h("ol", { class: "pub-list", reversed: true }, [
        h("li", [
          h(
            "span",
            "Dean, C.D. et al. 2025. The structure of the end-Cretaceous dinosaur fossil record in North America. Current Biology. 35(9)P1973-1988.E6. 10.1016/j.cub.2025.03.025."
          ),
          h(
            "a",
            { href: "https://linkinghub.elsevier.com/retrieve/pii/S0960982225003100", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Lovelace, D. M., Kufner, A.M., et al. 2025. Rethinking dinosaur origins: oldest known equatorial dinosaur-bearing assemblage (mid-late Carnian Popo Agie FM, Wyoming, USA). Zoological Journal of the Linnean Society, 203(1),zlae153"
          ),
          h(
            "a",
            { href: "https://apps.crossref.org/pendingpub/pendingpub.html?doi=10.1093%2Fzoolinnean%2Fzlae153", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Walton, C.R. and O. Shorttle. 2024. Phanerozoic biological reworking of the continental carbonate rock reservoir. Earth and Planetary Science Letters, 632,118640. 10.1016/j.epsl.2024.118640"
          ),
          h(
            "a",
            { href: "https://linkinghub.elsevier.com/retrieve/pii/S0012821X24000736", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Jones, L.A., C.D. Dean, W. Gearty, B.J. Allen. 2024. rmacrostrat : An R package for accessing and retrieving data from the Macrostrat geological database. Geosphere, 20(6):1456–1467. 10.1130/GES02815.1."
          ),
          h(
            "a",
            { href: "https://doi.org/10.1130/GES02815.1", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Evans, S.D., E.F. Smith, P. Vayda, L.L. Nelson, S. Xiao. 2024. The Ediacara Biota of the Wood Canyon formation: Latest Precambrian macrofossils and sedimentary structures from the southern Great Basin. Global and Planetary Change, 242:104851. 10.1016/j.gloplacha.2024.104547."
          ),
          h(
            "a",
            {
              href: "https://doi.org/10.1016/j.gloplacha.2024.104547",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Howes, B., A. Mehra, E. Geyman, J. Wilcots, R. Manzuk, C. Deutsch, A. Maloof. 2024. The where, when, and how of ooid formation: what ooids tell us about ancient seawater chemistry. Earth and Planetary Science Letters, 637:118697. 10.1016/j.epsl.2024.118697."
          ),
          h(
            "a",
            {
              href: "https://doi.org/10.1016/j.epsl.2024.118697",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Smiley, T.M., A.Bahadori, E.T. Rasbury, W.E. Holt, C. Badgley. 2024. Tectonic extension and paleoelevation influence mammalian diversity dynamics in the Basin and Range Province of western North America. Science Advances, 10:eadn6842. 10.1126/sciadv.adn6842."
          ),
          h(
            "a",
            {
              href: "https://www.science.org/doi/10.1126/sciadv.adn6842",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Gazdewich, S., T. Hauck, J. Husson. 2024. Authigenic carbonate burial within the Late Devonian western Canada sedimentary basin and its impact on the global carbon cycle. Geochemistry, Geophysics, Geosystems 10.1029/2023GC011376"
          ),
          h(
            "a",
            { href: "https://doi.org/10.1029/2023GC011376", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Segessenman, D.C. and S.E. Peters. 2024. Transgression-regression cycles drive correlations in Ediacaran-Cambrian rock and fossil records. Paleobiology 10.1017/pab.2023.31."
          ),
          h(
            "a",
            { href: "https://doi.org/10.1017/pab.2023.31", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Quinn, D.P., C.R. Idzikowski, S.E. Peters. 2024. Building a multi-scale, collaborative, and time-integrated digital crust: The next stage of the Macrostrat data system. Geoscience Data Journal 10.1002/gdj3.189"
          ),
          h(
            "a",
            { href: "https://doi.org/10.1002/gdj3.189", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Tasistro-Hart, A.R. and F.A. Macdonald. 2023. Phanerozoic flooding of North America and the Great Unconformity. Proceedings of the National Academy of Sciences 120(37):e2309084120."
          ),
          h(
            "a",
            { href: "https://www.pnas.org/doi/abs/10.1073/pnas.2309084120", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Husson, J.M. and L.A. Coogan. 2023. River chemistry reveals a large decrease in dolomite abundance across the Phanerozoic. Geochemical Perspective Letters 26:1-6."
          ),
          h(
            "a",
            { href: "https://doi.org/10.1130/B37058.1", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Walton, C.R., J. Hao, F. Huang, F.E. Jenner, H. Williams, A.L. Zerkle, A. Lipp, R.M. Hazen, S.E. Peters, O. Shorttle. 2023. Evolution of the crustal phosphorus reservoir. Science Advances 9(18):eade6923."
          ),
          h(
            "a",
            {
              href: "https://doi.org/10.1126/sciadv.ade6923",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Balseiro, D. and M.G. Powell. 2023. Relative oversampling of carbonate rocks in the North American marine fossil record. Paleobiology"
          ),
          h(
            "a",
            { href: "https://doi.org/10.1017/pab.2023.16", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Ye, S., S.E. Peters. 2023. Bedrock geological map predictions for Phanerozoic fossil occurrences. Paleobiology 49(3):394-413."
          ),
          h(
            "a",
            { href: "https://doi.org/10.1017/pab.2022.46", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Wang, J., Tarhan, L.G., Jacobson, A.D. et al. 2023. The evolution of the marine carbonate factory. Nature https://doi.org/10.1038/s41586-022-05654-5."
          ),
          h(
            "a",
            {
              href: "https://www.nature.com/articles/s41586-022-05654-5",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Capel, E., C. Monnet, C.J. Cleal, J. Xue, T. Servais, B. Cascales-Miñana. 2023. The effect of geological biases on our perception of early land plant radiation. Palaeontology 66:e12644."
          ),
          h(
            "a",
            {
              href: "https://onlinelibrary.wiley.com/doi/epdf/10.1111/pala.12644",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Sessa, J.A., A.J. Fraass, LJ. LeVay, K.M. Jamson, S.E. Peters. 2023. The Extending Ocean Drilling Pursuits (eODP) Project: Synthesizing Scientific Ocean Drilling Data. Geochemistry, Geophysics, Geosystems"
          ),
          h(
            "a",
            { href: "https://doi.org/10.1029/2022GC010655", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Segessenman, D.C. and S.E. Peters. 2023. Macrostratigraphy of the Ediacaran system in North America. In 'Laurentia: Turning Points in the Evolution of a Continent.' S.J. Whitmeyer, M.L. Williams, D.A. Kellett, B. Tikoff, eds. GSA Memoir."
          ),
          h(
            "a",
            { href: "https://doi.org/10.1130/2022.1220(21)", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Boulila, S., S.E. Peters, R.D. Müller, B.U. Haq, N.Hara. 2023. Earth's interior dynamics drive marine fossil diversity cycles of tens of millions of years. Proceedings of the National Academy of Sciences e2221149120."
          ),
          h(
            "a",
            {
              href: "https://doi.org/0.1073/pnas.2221149120",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E., D. Quinn, J.M. Husson, R.R. Gaines. 2022. Macrostratigraphy: insights into cyclic and secular evolution of the Earth-life system. Ann. Rev. Earth & Planet. Sci. 50:419-449."
          ),
          h(
            "a",
            {
              href: "https://doi.org/10.1146/annurev-earth-032320-081427",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Emmings, J.F., S.W. Poulton, J. Walsh, K.A. Leeming, I. Ross, S.E. Peters. 2022. Pyrite mega-analysis reveals modes of anoxia through geologic time. Science Advances 8(11)."
          ),
          h(
            "a",
            {
              href: "https://doi.org/10.1126/sciadv.abj5687",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Chen, G., Q. Cheng, S.E. Peters, C.J. Spencer, M. Zhao. 2022. Feedback between surface and deep processes: insight from time series analysis of sedimentary record. Earth and Planet. Sci. Letters."
          ),
          h(
            "a",
            {
              href: "https://doi.org/10.1016/j.epsl.2021.117352",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E. et al. 2021. Igneous rock area and age in continental crust. Geology. doi:10.1130/G49037.1."
          ),
          h(
            "a",
            { href: "https://doi.org/10.1130/G49037.1", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Loughney, K.M., C. Badgley, A. Bahadori, W.E. Hold, and E.T. Rasbury. 2021. Tectonic influence on Cenozoic mammal richness and sedimentation history of the Basin and Range, western North America. Science Advances 7(45):p.eabh4470."
          ),
          h(
            "a",
            {
              href: "https://doi.org/10.1126/sciadv.abh4470",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Key, M.M. Jr., P.N.W. Jackson, C.M. Reid. 2021. Trepostome bryozoans buck the trend and ignore calcite-aragonite seas. Palaeobiodiversity and Palaeoenvironments. doi:10.1007/s12549-021-00507-x."
          ),
          h(
            "a",
            {
              href: "https://link.springer.com/article/10.1007/s12549-021-00507-x",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Lipp, A.G. et al. 2021. The composition and weathering of the continents over geologic time. Geochemical Perspectives Letters. doi:10.7185/geochemlet.2109."
          ),
          h(
            "a",
            {
              href: "https://doi.org/10.7185/geochemlet.2109",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Barnes, B.D., J.M. Husson, S.E. Peters. 2020. Authigenic carbonate burial in the Late Devonian–Early Mississippian Bakken Formation (Williston Basin, USA). Sedimentology. doi:10.1111/sed.12695."
          ),
          h(
            "a",
            { href: "https://doi.org/10.1111/sed.12695", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Close, R.A. et al. 2020. The spatial structure of Phanerozoic marine animal diversity. Science doi:10.1126/science.aay8309."
          ),
          h(
            "a",
            {
              href: "https://doi.org/10.1126/science.aay8309",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Balseiro, D. and Powell, M.G. 2019. Carbonate collapse and the Late Paleozoic Ice Age marine biodiversity crisis. Geology doi:10.1130/G46858.1"
          ),
          h(
            "a",
            { href: "https://doi.org/10.1130/G46858.1", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Keller, C.B., J.M. Husson, R.N. Mitchell, W.F. Bottke, T.M. Gernon, P. Boehnke, E.A. Bell, N.L. Swanson-Hysell, S.E. Peters. 2019. Neoproterozoic glacial origin of the Great Unconformity. Proc. Nat. Acad. of Sci. USA. 116(4):1136-1145. doi:10.1073/pnas.1804350116"
          ),
          h(
            "a",
            {
              href: "https://doi.org/10.1073/pnas.1804350116",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Keating-Bitonti, C.R., and S.E. Peters. 2019. Influence of increasing carbonate saturation in Atlantic bottom water during the late Miocene. Palaeogeography, Palaeoclimatology, Palaeoecology 518:134-142. doi:10.1016/j.palaeo.2019.01.006"
          ),
          h(
            "a",
            {
              href: "https://doi.org/10.1016/j.palaeo.2019.01.006",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Cohen, P.A., R. Lockwood, S.E. Peters. 2018. Integrating Macrostrat and Rockd into undergraduate Earth Science Teaching. Elements of Paleontology. doi:10.1017/9781108681445"
          ),
          h(
            "a",
            { href: "https://doi.org/10.1017/9781108681445", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Isson, T.T., and N.J. Planavsky. 2018. Reverse weathering as a long-term stabilizer of marine pH and planetary climate. Nature 560:571-475. doi:10.1038/s41586-018-0408-4"
          ),
          h(
            "a",
            {
              href: "https://doi.org/10.1038/s41586-018-0408-4",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Husson, J.M. and S.E. Peters. 2018. Nature of the sedimentary rock record and its implications for Earth system evolution. Emerging Topics in Life Sciences. doi:10.1042/ETLS20170152"
          ),
          h(
            "a",
            { href: "https://doi.org/10.1042/ETLS20170152", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E., J.M. Husson. 2018. We need a global comprehensive stratigraphic database: here’s a start. The Sedimentary Record 16(1). doi:10.2110/sedred.2018.1"
          ),
          h(
            "a",
            {
              href: "https://www.sepm.org/files/161article.l5vs1la4j8g2gxzu.pdf",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E., J.M. Husson, J. Czaplewski. 2018. Macrostrat: a platform for geological data integration and deep-time Earth crust research. Geochemistry, Geophysics, Geosystems."
          ),
          h(
            "a",
            { href: "https://doi.org/10.1029/2018GC007467", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Schachat, S.R., C.C. Labandeira, M.R. Saltzman, B.D. Cramer, J.L. Payne, C.K. Boyce. 2018. Phanerozoic pO2 and the early evolution of terrestrial animals. Proc. Roy. Soc. B."
          ),
          h(
            "a",
            {
              href: "http://dx.doi.org/10.1098/rspb.2017.2631",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Zaffos, A., S. Finnegan, S.E. Peters. 2017. Plate tectonic regulation of global marine animal diversity. Proc. Nat. Acad. of Sci. USA."
          ),
          h(
            "a",
            {
              href: "http://www.pnas.org/cgi/doi/10.1073/pnas.1702297114",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E., J.M. Husson. J. Wilcots. 2017. Rise and fall of stromatolites in shallow marine environments. Geology."
          ),
          h(
            "a",
            { href: "http://dx.doi.org/10.1130/G38931.1", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E., J.M. Husson. 2017. Sediment cycling on continental and oceanic crust. Geology 45:323-326."
          ),
          h(
            "a",
            {
              href: "http://geology.geoscienceworld.org/content/45/4/323.full?ijkey=UZ6cbXCii4p8w&keytype=ref&siteid=gsgeology",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Husson, J.M., S.E. Peters. 2017. Atmospheric oxygenation driven by unsteady growth of the continental sedimentary reservoir. Earth and Planetary Science Letters. 460:68-75"
          ),
          h(
            "a",
            {
              href: "http://www.sciencedirect.com/science/article/pii/S0012821X16307129",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Schott, R. 2017. Rockd: Geology at your fingertips in a mobile world. Bulletin of the Eastern Section of the National Association of Geoscience Teachers 67(2):1-4."
          ),
          h(
            "a",
            {
              href: "https://www.hcc.edu/Documents/Faculty-Staff/winters-trobaugh%20%27cli-fi%20@%202y%27%20Spring%202017%20NAGT-ES%20Bulletin%20CB.pdf",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Chan, M.A., S.E. Peters, B. Tikoff. 2016. The future of field geology, open data sharing, and cybertechnology in Earth science. The Sedimentary Record 14:4-10."
          ),
          h(
            "a",
            {
              href: "http://www.sepm.org/CM_Files/SedimentaryRecord/SedRecord14-1%234.pdf",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Nelsen, M.P., B.A. DiMichele, S.E. Peters, C.K. Boyce. 2016. Delayed fungal evolution did not cause the Paleozoic peak in coal production. Proc. Nat. Acad. of Sci. USA."
          ),
          h(
            "a",
            {
              href: "http://www.pnas.org/cgi/doi/10.1073/pnas.1517943113",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Heavens, N.G. 2015. Injecting climate modeling into deep time studies: ideas for nearly every project. The Sedimentary Record 13:(4)4-10."
          ),
          h(
            "a",
            {
              href: "http://dx.doi.org/10.1016/j.earscirev.2016.05.004",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Carroll, A.R. 2015. Geofuels: energy and the Earth. Cambridge University Press."
          ),
          h(
            "a",
            {
              href: "http://www.cambridge.org/us/academic/subjects/earth-and-environmental-science/environmental-science/geofuels-energy-and-earth?format=PB&isbn=9781107401204",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Thomson, T.J. and M.L. Droser. 2015. Swimming reptiles make their mark in the Early Triassic: delayed ecologic recovery increased the preservation potential of vertebrate swim tracks. Geology 43:215-218."
          ),
          h(
            "a",
            {
              href: "http://geology.gsapubs.org/content/44/3/215.abstract?sid=8573a247-dfc8-482b-960d-ee8afe846a40",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Fraass, A.J., D.C. Kelly, S.E. Peters. 2015. Macroevolutionary history of the planktic foraminifera. Annual Review of Earth and Planetary Sciences 43:5.1-5.28."
          ),
          h(
            "a",
            {
              href: "http://dx.doi.org/10.1146/annurev-earth-060614-105059",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Fan, Y., S. Richard, R.S. Bristol, S.E. Peters, et al.. 2015. DigitalCrust: A 4D data system of material properties for transforming research on crustal fluid flow. Geofluids 15:372-379"
          ),
          h(
            "a",
            { href: "http://dx.doi.org/10.1111/gfl.12114", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E., D.C. Kelly, and A. Fraass. 2013. Oceanographic controls on the diversity and extinction of planktonic foraminifera. Nature. 493:398-401."
          ),
          h(
            "a",
            {
              href: "http://www.nature.com/nature/journal/v493/n7432/full/nature11815.html",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Benson, R.B.J., P.D. Mannion, R.J. Butler, P. Upchurch, A. Goswami, and S.E. Evans. 2012. Cretaceous tetrapod fossil record sampling and faunal turnover: implications for biogeography and the rise of modern clades. Palaeogeography, Palaeoclimatology, Palaeoecology."
          ),
          h(
            "a",
            {
              href: "http://www.sciencedirect.com/science/article/pii/S0031018212006116",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Rook, D.L., N.A. Heim, and J. Marcot. 2012.Contrasting patterns and connections of rock and biotic diversity in the marine and non-marine fossil records of North America. Palaeogeography, Palaeoclimatology, Palaeoecology. 372:123-129."
          ),
          h(
            "a",
            {
              href: "http://www.sciencedirect.com/science/article/pii/S0031018212005718",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Halevy, I, S.E. Peters, and W.W. Fischer. 2012. Sulfate burial constraints on the Phanerozoic sulfur cycle. Science 337:331-334. doi:10.1126/science.1220224"
          ),
          h(
            "a",
            {
              href: "http://www.sciencemag.org/content/337/6092/331.abstract",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E. and R.R. Gaines. 2012. Formation of the ‘Great Unconformity’ as a trigger for the Cambrian explosion. Nature 484:363-366. doi:10.1038/nature10969"
          ),
          h(
            "a",
            {
              href: "http://www.nature.com/nature/journal/v484/n7394/full/nature10969.html",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Finnegan, S., N.A. Heim, S.E. Peters and W.W. Fischer. 2012. Climate change and the selective signature of the late Ordovician mass extinction. PNAS doi:10.1073/pnas.1117039109"
          ),
          h(
            "a",
            {
              href: "http://www.pnas.org/content/early/2012/04/16/1117039109.abstract",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Hannisdal, B. and S.E. Peters. 2011. Phanerozoic Earth system evolution and marine biodiversity. Science 334:1121-1124."
          ),
          h(
            "a",
            {
              href: "http://www.sciencemag.org/content/334/6059/1121.short",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Butler, R.J. et al. 2011. Sea level, dinosaur diversity and sampling biases: investigating the ‘common cause’ hypothesis in the terrestrial realm. Proc. Roy. Soc. London B 278:1165-1170. "
          ),
          h(
            "a",
            {
              href: "http://rspb.royalsocietypublishing.org/content/278/1709/1165.abstract",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Melott, A.L. and R.K. Bambach 2011. A ubquitous ~62-Myr periodic fluctuation superimposed on general trends in fossil biodiversity II. Evolutionary dynamics associated with period fluctuation in marine diversity. Paleobiology 37:369-382."
          ),
          h(
            "a",
            {
              href: "http://paleobiol.geoscienceworld.org/cgi/content/abstract/37/3/383",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Heim, N.A. and S.E. Peters. 2011. Regional environmental breadth predicts geographic range and longevity in fossil marine genera. PLoS One 6:(5) e18946; doi:10.1371/journal.pone.0018946"
          ),
          h(
            "a",
            {
              href: "http://geology.gsapubs.org/content/39/11/1079.abstract",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E. and N.A. Heim. 2011. Macrostratigraphy and macroevolution in marine environments: testing the common-cause hypothesis. In, Smith, A.B., and A. McGowan, eds. Comparing the rock and fossil records: implications for biodiversity. Special Publication of the Geological Society of London 358:95-104."
          ),
          h(
            "a",
            {
              href: "http://sp.lyellcollection.org/content/358/1/95.abstract",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E. and N.A. Heim. 2011. The stratigraphic distribution of marine fossils in North America. Geology 39:259-262; doi: 10.1130/G31442.1."
          ),
          h(
            "a",
            {
              href: "http://geology.geoscienceworld.org/cgi/content/full/39/3/259?ijkey=ziaWozfgcb82w&keytype=ref&siteid=gsgeology",
              target: "_blank",
            },
            "[PDF]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Finnegan, S., S.E. Peters, and W.W. Fischer. 2011. Late Ordovician-Early Silurian selective extinction patterns in Laurentia and their relationship to climate change. In J.C. Gutiérrez-Marco, I. Rábano, and D. Garcia-Bellido, eds. Ordovician of the World. Cuadernos del Museo Geominera 14: 155-159."
          ),
        ]),
        h("li", [
          h(
            "span",
            "Meyers, S.R. and S.E. Peters. 2011. A 56 million year rhythm in North American sedimentation during the Phanerozoic. EPSL doi:10.1016/j.epsl.2010.12.044."
          ),
          h(
            "a",
            {
              href: "http://dx.doi.org/10.1016/j.epsl.2010.12.044",
              target: "_blank",
            },
            "[PDF]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Heim, N.A. and S.E. Peters. 2011. Covariation in macrostratigraphic and macroevolutionary patterns in the marine record of North America. GSA Bulletin 123:620-630."
          ),
          h(
            "a",
            {
              href: "http://bulletin.geoscienceworld.org/cgi/content/full/123/3-4/620?ijkey=PALfAKR8a3Yio&keytype=ref&siteid=gsabull",
              target: "_blank",
            },
            "[PDF]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E. and N.A. Heim. 2010. The geological completeness of paleontological sampling in North America. Paleobiology 36:61-79."
          ),
          h(
            "a",
            {
              href: "http://strata.geology.wisc.edu/vita/reprints/PetersHeim2010.pdf",
              target: "_blank",
            },
            "[PDF]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Marx, F.G. 2009. Marine mammals through time: when less is more in studying palaeodiversity. Proceedings of the Royal Society of London B 138:183-196."
          ),
          h(
            "a",
            {
              href: "http://rspb.royalsocietypublishing.org/content/276/1658/887.abstract",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "McGowan, A.J., and A. Smith. 2008. Are global Phanerozoic marine diversity curves truly global? A study of the relationship between regional rock records and global Phanerozoic marine diversity. Paleobiology 34:80-103."
          ),
          h(
            "a",
            {
              href: "http://paleobiol.geoscienceworld.org/cgi/content/abstract/34/1/80",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Mayhew, P.J., G.B. Jenkins, and T.G. Benton. 2008. Long-term association between global temperature and biodiversity, origination and extinction in the fossil record. Proceedings of the Royal Society of London B 275:47-53."
          ),
          h(
            "a",
            {
              href: "http://rspb.royalsocietypublishing.org/content/275/1630/47",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E. 2008. Environmental determinants of extinction selectivity in the fossil record. Nature 454:626-629."
          ),
          h(
            "a",
            {
              href: "http://strata.geology.wisc.edu/vita/reprints/Peters2008.pdf",
              target: "_blank",
            },
            "[PDF]"
          ),
          h(
            "a",
            {
              href: "http://strata.geology.wisc.edu/vita/reprints/Peters2008sup.pdf",
              target: "_blank",
            },
            "[supplement]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E. 2008. Macrostratigraphy and its promise for paleobiology. Pp. 205-232 In P.H. Kelley and R.K. Bambach, eds. From evolution to geobiology: research questions driving paleontology at the start of a new century. The Paleontological Society Papers, Vol. 14. 9"
          ),
          h(
            "a",
            { href: "http://paleosoc.org/psp/psp14.html", target: "_blank" },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E. and W.I. Ausich. 2008. A sampling-standardized macroevolutionary history for Ordovician-Early Silurian crinoids. Paleobiology 34:104-116."
          ),
          h(
            "a",
            {
              href: "http://strata.geology.wisc.edu/vita/reprints/Peters&Ausich2008.pdf",
              target: "_blank",
            },
            "[PDF]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Smith, A.B. 2007. Marine diversity through the Phanerozoic: problems and prospects. Journal of the Geological Society, London 164:731-745."
          ),
          h(
            "a",
            {
              href: "http://jgs.geoscienceworld.org/cgi/content/abstract/164/4/731",
              target: "_blank",
            },
            "[link]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E. 2007. The problem with the Paleozoic. Paleobiology 33:165-181."
          ),
          h(
            "a",
            {
              href: "http://strata.geology.wisc.edu/vita/reprints/Peters2007.pdf",
              target: "_blank",
            },
            "[PDF]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E. 2006. Macrostratigraphy of North America. Journal of Geology 114:391-412."
          ),
          h(
            "a",
            {
              href: "http://strata.geology.wisc.edu/vita/reprints/Peters2006.pdf",
              target: "_blank",
            },
            "[PDF]"
          ),
        ]),
        h("li", [
          h(
            "span",
            "Peters, S.E. 2005. Geologic constraints on the macroevolutionary history of marine animals. Proceedings of the National Academy of Sciences U.S.A. 102:12326-12331."
          ),
          h(
            "a",
            {
              href: "http://strata.geology.wisc.edu/vita/reprints/Peters2005.pdf",
              target: "_blank",
            },
            "[PDF]"
          ),
        ]),
      ]),
    ]),
    h(Footer),
  ]);
}
