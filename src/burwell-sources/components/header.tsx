import React from "react";
import { Navbar } from "@blueprintjs/core";
import Options from "./options";

const Header = () => {
  return (
    <Navbar className="header">
      <Navbar.Group>
        <Navbar.Heading>
          <h4 className="title">Macrostrat - map sources</h4>
        </Navbar.Heading>
      </Navbar.Group>
      <Navbar.Group align={"right"}>
        <Options />
      </Navbar.Group>
    </Navbar>
  );
};

export default Header;
