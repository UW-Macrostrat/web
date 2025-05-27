import { Image, Navbar, Footer } from "../index";
import h  from "./main.module.sass"

export function Page() {
    return h('div.container', [
        h(Navbar),

        h('div.publications', [
            h('h1.pub-title', "Publications"),
            h('p.blurb', "literature utilizing Macrostrat"),
            h('div.pub-line'),
            h('ol', { class: 'pub-list', reversed: true }, [
                h('li', [
                    h('span', "Gazdewich, S., T. Hauck, J. Husson. 2024. Authigenic carbonate burial within the Late Devonian western Canada sedimentary bsain and its impact on the global carbon cycle. <em>Geochemistry, Geophysics, Geosystems</em> 10.1029/2023GC011376."),
                    h('a', { href: 'https://doi.org/10.1029/2023GC011376', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Segessenman, D.C. and S.E. Peters. 2024. Transgression-regression cycles drive correlations in Ediacaran-Cambrian rock and fossil records. <em>Paleobiology</em> 10.1017/pab.2023.31."),
                    h('a', { href: 'https://doi.org/10.1017/pab.2023.31', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Quinn, D.P., S.E. Peters, J.M. Husson, R.R. Gaines. 2024. The Macrostrat data system: a platform for Earth crust research and education. <em>Geochemistry, Geophysics, Geosystems</em> 10.1029/2023GC013098."),
                    h('a', { href: 'https://doi.org/10.1029/2023GC013098', target: '_blank' }, "[link]")
                ]),

                h('li', [
                    h('span', "Husson, J.M., S.E. Peters, D.C. Segessenman, R.R. Gaines. 2024. The sedimentary rock record of the Ediacaran-Cambrian transition in North America. <em>Geological Society of America Bulletin</em> 10.1130/B37058.1."),
                    h('a', { href: 'https://doi.org/10.1130/B37058.1', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Walton, C.R., J. Hao, F. Huang, F.E. Jenner, H. Williams, A.L. Zerkle, A. Lipp, R.M. Hazen, S.E. Peters, O. Shorttle. 2023. Evolution of the crustal phosphorus reservoir. <em>Science Advances</em> 9(18):eade6923."),
                    h('a', { href: 'https://doi.org/10.1126/sciadv.ade6923', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Balseiro, D. and M.G. Powell. 2023. Relative oversampling of carbonate rocks in the North American marine fossil record. <em>Paleobiology</em>"),
                    h('a', { href: 'https://doi.org/10.1017/pab.2023.16', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Ye, S., S.E. Peters. 2023. Bedrock geological map predictions for Phanerozoic fossil occurrences. <em>Paleobiology</em> 49(3):394-413."),
                    h('a', { href: 'https://doi.org/10.1017/pab.2022.46', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Wang, J., Tarhan, L.G., Jacobson, A.D. et al. 2023. The evolution of the marine carbonate factory. <em>Nature</em> https://doi.org/10.1038/s41586-022-05654-5."),
                    h('a', { href: 'https://www.nature.com/articles/s41586-022-05654-5', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Capel, E., C. Monnet, C.J. Cleal, J. Xue, T. Servais, B. Cascales-Miñana. 2023. The effect of geological biases on our perception of early land plant radiation. <em>Palaeontology</em> 66:e12644."),
                    h('a', { href: 'https://onlinelibrary.wiley.com/doi/epdf/10.1111/pala.12644', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Sessa, J.A., A.J. Fraass, LJ. LeVay, K.M. Jamson, S.E. Peters. 2023. The Extending Ocean Drilling Pursuits (eODP) Project: Synthesizing Scientific Ocean Drilling Data. <em>Geochemistry, Geophysics, Geosystems</em>"),
                    h('a', { href: 'https://doi.org/10.1029/2022GC010655', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Segessenman, D.C. and S.E. Peters. 2023. Macrostratigraphy of the Ediacaran system in North America. In 'Laurentia: Turning Points in the Evolution of a Continent.' S.J. Whitmeyer, M.L. Williams, D.A. Kellett, B. Tikoff, eds. <em>GSA Memoir.</em>"),
                    h('a', { href: 'https://doi.org/10.1130/2022.1220(21)', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Boulila, S., S.E. Peters, R.D. Müller, B.U. Haq, N.Hara. 2023. Earth's interior dynamics drive marine fossil diversity cycles of tens of millions of years. <em>Proceedings of the National Academy of Sciences</em> e2221149120."),
                    h('a', { href: 'https://doi.org/0.1073/pnas.2221149120', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Peters, S.E., D. Quinn, J.M. Husson, R.R. Gaines. 2022. Macrostratigraphy: insights into cyclic and secular evolution of the Earth-life system. <em>Ann. Rev. Earth & Planet. Sci.</em> 50:419-449."),
                    h('a', { href: 'https://doi.org/10.1146/annurev-earth-032320-081427', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Emmings, J.F., S.W. Poulton, J. Walsh, K.A. Leeming, I. Ross, S.E. Peters. 2022. Pyrite mega-analysis reveals modes of anoxia through geologic time. <em>Science Advances</em> 8(11)."),
                    h('a', { href: 'https://doi.org/10.1126/sciadv.abj5687', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Chen, G., Q. Cheng, S.E. Peters, C.J. Spencer, M. Zhao. 2022. Feedback between surface and deep processes: insight from time series analysis of sedimentary record. <em>Earth and Planet. Sci. Letters.</em>"),
                    h('a', { href: 'https://doi.org/10.1016/j.epsl.2021.117352', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Peters, S.E. et al. 2021. Igneous rock area and age in continental crust. <em>Geology.</em> doi:10.1130/G49037.1."),
                    h('a', { href: 'https://doi.org/10.1130/G49037.1', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Loughney, K.M., C. Badgley, A. Bahadori, W.E. Hold, and E.T. Rasbury. 2021. Tectonic influence on Cenozoic mammal richness and sedimentation history of the Basin and Range, western North America. <em>Science Advances</em> 7(45):p.eabh4470."),
                    h('a', { href: 'https://doi.org/10.1126/sciadv.abh4470', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Key, M.M. Jr., P.N.W. Jackson, C.M. Reid. 2021. Trepostome bryozoans buck the trend and ignore calcite-aragonite seas. <em>Palaeobiodiversity and Palaeoenvironments.</em> doi:10.1007/s12549-021-00507-x."),
                    h('a', { href: 'https://link.springer.com/article/10.1007/s12549-021-00507-x', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Lipp, A.G. et al. 2021. The composition and weathering of the continents over geologic time. <em>Geochemical Perspectives Letters.</em> doi:10.7185/geochemlet.2109."),
                    h('a', { href: 'https://doi.org/10.7185/geochemlet.2109', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Barnes, B.D., J.M. Husson, S.E. Peters. 2020. Authigenic carbonate burial in the Late Devonian–Early Mississippian Bakken Formation (Williston Basin, USA). <em>Sedimentology.</em> doi:10.1111/sed.12695."),
                    h('a', { href: 'https://doi.org/10.1111/sed.12695', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Close, R.A. et al. 2020. The spatial structure of Phanerozoic marine animal diversity. <em>Science</em> doi:10.1126/science.aay8309."),
                    h('a', { href: 'https://doi.org/10.1126/science.aay8309', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Balseiro, D. and M.G. Powell. 2019. Carbonate collapse and the Late Paleozoic Ice Age marine biodiversity crisis. <em>Geology</em> doi:10.1130/G46858.1."),
                    h('a', { href: 'https://doi.org/10.1130/G46858.1', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Keller, C.B., J.M. Husson, R.N. Mitchell, W.F. Bottke, T.M. Gernon, P. Boehnke, E.A. Bell, N.L. Swanson-Hysell, S.E. Peters. 2019. Neoproterozoic glacial origin of the Great Unconformity. <em>Proc. Nat. Acad. of Sci. USA.</em> 116(4):1136-1145."),
                    h('a', { href: 'https://doi.org/10.1073/pnas.1804350116', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Keating-Bitonti, C.R., and S.E. Peters. 2019. Influence of increasing carbonate saturation in Atlantic bottom water during the late Miocene. <em>Palaeogeography, Palaeoclimatology, Palaeoecology</em> 518:134-142."),
                    h('a', { href: 'https://doi.org/10.1016/j.palaeo.2019.01.006', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Cohen, P.A., R. Lockwood, S.E. Peters. 2018. Integrating Macrostrat and Rockd into undergraduate Earth Science Teaching. <em>Elements of Paleontology</em>."),
                    h('a', { href: 'https://doi.org/10.1017/9781108681445', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Isson, T.T., and N.J. Planavsky. 2018. Reverse weathering as a long-term stabilizer of marine pH and planetary climate. <em>Nature</em> 560:571-475."),
                    h('a', { href: 'https://doi.org/10.1038/s41586-018-0408-4', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Husson, J.M. and S.E. Peters. 2018. Nature of the sedimentary rock record and its implications for Earth system evolution. <em>Emerging Topics in Life Sciences</em>."),
                    h('a', { href: 'https://doi.org/10.1042/ETLS20170152', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Peters, S.E., J.M. Husson. 2018. We need a global comprehensive stratigraphic database: here’s a start. <em>The Sedimentary Record</em> 16(1)."),
                    h('a', { href: 'https://www.sepm.org/files/161article.l5vs1la4j8g2gxzu.pdf', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Peters, S.E., J.M. Husson, J. Czaplewski. 2018. Macrostrat: a platform for geological data integration and deep-time Earth crust research. <em>Geochemistry, Geophysics, Geosystems</em>."),
                    h('a', { href: 'https://doi.org/10.1029/2018GC007467', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Schachat, S.R., C.C. Labandeira, M.R. Saltzman, B.D. Cramer, J.L. Payne, C.K. Boyce. 2018. Phanerozoic pO2 and the early evolution of terrestrial animals. <em>Proc. Roy. Soc. B.</em>"),
                    h('a', { href: 'http://dx.doi.org/10.1098/rspb.2017.2631', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Husson, J.M., S.E. Peters. 2017. The sedimentary rock record of the Ediacaran-Cambrian transition in North America. <em>Geological Society of America Bulletin</em>."),
                    h('a', { href: 'https://doi.org/10.1130/B31670.1', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Zaffos, A., S. Finnegan, S.E. Peters. 2017. Plate tectonic regulation of global marine animal diversity. <em>Proc. Nat. Acad. of Sci. USA</em>."),
                    h('a', { href: 'http://www.pnas.org/cgi/doi/10.1073/pnas.1702297114', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Peters, S.E., J.M. Husson. J. Wilcots. 2017. Rise and fall of stromatolites in shallow marine environments. <em>Geology</em>."),
                    h('a', { href: 'http://dx.doi.org/10.1130/G38931.1', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Peters, S.E., J.M. Husson. 2017. Sediment cycling on continental and oceanic crust. <em>Geology</em> 45:323-326."),
                    h('a', { href: 'http://geology.geoscienceworld.org/content/45/4/323.full?ijkey=UZ6cbXCii4p8w&keytype=ref&siteid=gsgeology', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Husson, J.M., S.E. Peters. 2017. Atmospheric oxygenation driven by unsteady growth of the continental sedimentary reservoir. <em>Earth and Planetary Science Letters</em>."),
                    h('a', { href: 'http://www.sciencedirect.com/science/article/pii/S0012821X16307129', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Schott, R. 2017. Rockd: Geology at your fingertips in a mobile world. <em>Bulletin of the Eastern Section of the National Association of Geoscience Teachers</em> 67(2):1-4."),
                    h('a', { href: 'https://www.hcc.edu/Documents/Faculty-Staff/winters-trobaugh%20%27cli-fi%20@%202y%27%20Spring%202017%20NAGT-ES%20Bulletin%20CB.pdf', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Chan, M.A., S.E. Peters, B. Tikoff. 2016. The future of field geology, open data sharing, and cybertechnology in Earth science. <em>The Sedimentary Record</em> 14:4-10."),
                    h('a', { href: 'http://www.sepm.org/CM_Files/SedimentaryRecord/SedRecord14-1%234.pdf', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Nelsen, M.P., B.A. DiMichele, S.E. Peters, C.K. Boyce. 2016. Delayed fungal evolution did not cause the Paleozoic peak in coal production. <em>Proc. Nat. Acad. of Sci. USA</em>."),
                    h('a', { href: 'http://www.pnas.org/cgi/doi/10.1073/pnas.1517943113', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Heavens, N.G. 2016. The role of climate in the evolution of the terrestrial biosphere: a review of the evidence from the fossil record. <em>Earth-Science Reviews</em> 159:1-27."),
                    h('a', { href: 'http://dx.doi.org/10.1016/j.earscirev.2016.05.004', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Carroll, A.R. 2016. <em>Geofuels: energy and the Earth</em>. Cambridge University Press."),
                    h('a', { href: 'http://www.cambridge.org/us/academic/subjects/earth-and-environmental-science/environmental-science/geofuels-energy-and-earth?format=PB&isbn=9781107401204', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Thomson, T.J. and M.L. Droser. 2015. Swimming reptiles make their mark in the Early Triassic: delayed ecologic recovery increased the preservation potential of vertebrate swim tracks. <em>Geology</em> 44:215-218."),
                    h('a', { href: 'http://geology.gsapubs.org/content/44/3/215.abstract?sid=8573a247-dfc8-482b-960d-ee8afe846a40', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Fraass, A.J., D.C. Kelly, S.E. Peters. 2015. Macroevolutionary history of the planktic foraminifera. <em>Annual Review of Earth and Planetary Sciences</em> 43:5.1-5.28."),
                    h('a', { href: 'http://dx.doi.org/10.1146/annurev-earth-060614-105059', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Fan, Y., S. Richard, R.S. Bristol, S.E. Peters, et al. 2015. DigitalCrust: A 4D data system of material properties for transforming research on crustal fluid flow. <em>Geofluids</em> 15:372-379."),
                    h('a', { href: 'http://dx.doi.org/10.1111/gfl.12114', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Peters, S.E., D.C. Kelly, and A. Fraass. 2013. Oceanographic controls on the diversity and extinction of planktonic foraminifera. <em>Nature</em>. 493:398-401."),
                    h('a', { href: 'http://www.nature.com/nature/journal/v493/n7432/full/nature11815.html', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Benson, R.B.J., P.D. Mannion, R.J. Butler, P. Upchurch, A. Goswami, and S.E. Evans. 2012. Cretaceous tetrapod fossil record sampling and faunal turnover: implications for biogeography and the rise of modern clades. <em>Palaeogeography, Palaeoclimatology, Palaeoecology</em>."),
                    h('a', { href: 'http://www.sciencedirect.com/science/article/pii/S0031018212006116', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Rook, D.L., N.A. Heim, and J. Marcot. 2012. Contrasting patterns and connections of rock and biotic diversity in the marine and non-marine fossil records of North America. <em>Palaeogeography, Palaeoclimatology, Palaeoecology</em>. 372:123-129."),
                    h('a', { href: 'http://www.sciencedirect.com/science/article/pii/S0031018212005718', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Halevy, I, S.E. Peters, and W.W. Fischer. 2012. Sulfate burial constraints on the Phanerozoic sulfur cycle. <em>Science</em> 337:331-334."),
                    h('a', { href: 'http://www.sciencemag.org/content/337/6092/331.abstract', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Peters, S.E. and R.R. Gaines. 2012. Formation of the ‘Great Unconformity’ as a trigger for the Cambrian explosion. <em>Nature</em> 484:363-366."),
                    h('a', { href: 'http://www.nature.com/nature/journal/v484/n7394/full/nature10969.html', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Finnegan, S., N.A. Heim, S.E. Peters and W.W. Fischer. 2012. Climate change and the selective signature of the late Ordovician mass extinction. <em>PNAS</em>."),
                    h('a', { href: 'http://www.pnas.org/content/early/2012/04/16/1117039109.abstract', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Hannisdal, B. and S.E. Peters. 2011. Phanerozoic Earth system evolution and marine biodiversity. <em>Science</em> 334:1121-1124."),
                    h('a', { href: 'http://www.sciencemag.org/content/334/6059/1121.short', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Butler, R.J. et al. 2011. Sea level, dinosaur diversity and sampling biases: investigating the ‘common cause’ hypothesis in the terrestrial realm. <em>Proc. Roy. Soc. London B</em> 278:1165-1170."),
                    h('a', { href: 'http://rspb.royalsocietypublishing.org/content/278/1709/1165.abstract', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Melott, A.L. and R.K. Bambach 2011. A ubiquitous ~62-Myr periodic fluctuation superimposed on general trends in fossil biodiversity II. Evolutionary dynamics associated with period fluctuation in marine diversity. <em>Paleobiology</em> 37:369-382."),
                    h('a', { href: 'http://paleobiol.geoscienceworld.org/cgi/content/abstract/37/3/383', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Heim, N.A. and S.E. Peters. 2011. Regional environmental breadth predicts geographic range and longevity in fossil taxa. <em>Geology</em> 39:1079-1082."),
                    h('a', { href: 'http://geology.gsapubs.org/content/39/11/1079.abstract', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Peters, S.E. and N.A. Heim. 2011. Macrostratigraphy and macroevolution in marine environments: testing the common-cause hypothesis. In, Smith, A.B., and A. McGowan, eds. Comparing the rock and fossil records: implications for biodiversity. <em>Special Publication of the Geological Society of London</em> 358:95-104."),
                    h('a', { href: 'http://sp.lyellcollection.org/content/358/1/95.abstract', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Peters, S.E. and N.A. Heim. 2011. The stratigraphic distribution of marine fossils in North America. <em>Geology</em> 39:259-262; doi: 10.1130/G31442.1."),
                    h('a', { href: 'http://geology.geoscienceworld.org/cgi/content/full/39/3/259?ijkey=ziaWozfgcb82w&keytype=ref&siteid=gsgeology', target: '_blank' }, "[PDF]")
                ]),
                h('li', [
                    h('span', "Finnegan, S., S.E. Peters, and W.W. Fischer. 2011. Late Ordovician-Early Silurian selective extinction patterns in Laurentia and their relationship to climate change. In J.C. Gutiérrez-Marco, I. Rábano, and D. Garcia-Bellido, eds. <em>Ordovician of the World.</em> Cuadernos del Museo Geominera 14: 155-159.")
                ]),
                h('li', [
                    h('span', "Meyers, S.R. and S.E. Peters. 2011. A 56 million year rhythm in North American sedimentation during the Phanerozoic. <em>EPSL</em> doi:10.1016/j.epsl.2010.12.044."),
                    h('a', { href: 'http://dx.doi.org/10.1016/j.epsl.2010.12.044', target: '_blank' }, "[PDF]")
                ]),
                h('li', [
                    h('span', "Heim, N.A. and S.E. Peters. 2011. Covariation in macrostratigraphic and macroevolutionary patterns in the marine record of North America. <em>GSA Bulletin</em> 123:620-630."),
                    h('a', { href: 'http://bulletin.geoscienceworld.org/cgi/content/full/123/3-4/620?ijkey=PALfAKR8a3Yio&keytype=ref&siteid=gsabull', target: '_blank' }, "[PDF]")
                ]),
                h('li', [
                    h('span', "Peters, S.E. and N.A. Heim. 2010. The geological completeness of paleontological sampling in North America. <em>Paleobiology</em> 36:61-79."),
                    h('a', { href: 'http://strata.geology.wisc.edu/vita/reprints/PetersHeim2010.pdf', target: '_blank' }, "[PDF]")
                ]),
                h('li', [
                    h('span', "Marx, F.G. 2009. Marine mammals through time: when less is more in studying palaeodiversity. <em>Proceedings of the Royal Society of London B</em> 138:183-196."),
                    h('a', { href: 'http://rspb.royalsocietypublishing.org/content/276/1658/887.abstract', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "McGowan, A.J., and A. Smith. 2008. Are global Phanerozoic marine diversity curves truly global? A study of the relationship between regional rock records and global Phanerozoic marine diversity. <em>Paleobiology</em> 34:80-103."),
                    h('a', { href: 'http://paleobiol.geoscienceworld.org/cgi/content/abstract/34/1/80', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Mayhew, P.J., G.B. Jenkins, and T.G. Benton. 2008. Long-term association between global temperature and biodiversity, origination and extinction in the fossil record. <em>Proceedings of the Royal Society of London B</em> 275:47-53."),  
                    h('a', { href: 'http://rspb.royalsocietypublishing.org/content/275/1630/47', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Peters, S.E. 2008. Environmental determinants of extinction selectivity in the fossil record. <em>Nature</em> 454:626-629."),
                    h('a', { href: 'http://strata.geology.wisc.edu/vita/reprints/Peters2008.pdf', target: '_blank' }, "[PDF]"),
                    h('a', { href: 'http://strata.geology.wisc.edu/vita/reprints/Peters2008sup.pdf', target: '_blank' }, "[supplement]")
                ]),
                h('li', [
                    h('span', "Peters, S.E. 2008. Macrostratigraphy and its promise for paleobiology. Pp. 205-232 <em>In</em> P.H. Kelley and R.K. Bambach, eds. From evolution to geobiology: research questions driving paleontology at the start of a new century. The Paleontological Society Papers, Vol. 14."),
                    h('a', { href: 'http://paleosoc.org/psp/psp14.html', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Peters, S.E. and W.I. Ausich. 2008. A sampling-standardized macroevolutionary history for Ordovician-Early Silurian crinoids. <em>Paleobiology</em> 34:104-116."),
                    h('a', { href: 'http://strata.geology.wisc.edu/vita/reprints/Peters&Ausich2008.pdf', target: '_blank' }, "[PDF]")
                ]),
                h('li', [
                    h('span', "Smith, A.B. 2007. Marine diversity through the Phanerozoic: problems and prospects. <em>Journal of the Geological Society, London</em> 164:731-745."),
                    h('a', { href: 'http://jgs.geoscienceworld.org/cgi/content/abstract/164/4/731', target: '_blank' }, "[link]")
                ]),
                h('li', [
                    h('span', "Peters, S.E. 2007. The problem with the Paleozoic. <em>Paleobiology</em> 33:165-181."),
                    h('a', { href: 'http://strata.geology.wisc.edu/vita/reprints/Peters2007.pdf', target: '_blank' }, "[PDF]")
                ]),
                h('li', [
                    h('span', "Peters, S.E. 2006. Macrostratigraphy of North America. <em>Journal of Geology</em> 114:391-412."),
                    h('a', { href: 'http://strata.geology.wisc.edu/vita/reprints/Peters2006.pdf', target: '_blank' }, "[PDF]")
                ]),
                h('li', [
                    h('span', "Peters, S.E. 2005. Geologic constraints on the macroevolutionary history of marine animals. <em>Proceedings of the National Academy of Sciences U.S.A.</em> 102:12326-12331."),
                    h('a', { href: 'http://strata.geology.wisc.edu/vita/reprints/Peters2005.pdf', target: '_blank' }, "[PDF]")
                ]),
            ]),
        ]),
        h(Footer)
    ])
}