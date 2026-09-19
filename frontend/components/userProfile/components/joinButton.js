import React, { useState } from "react";
import AuthenticationStore from "../../../stores/authentication";
import Button from "./button";
import { createUseStyles } from "react-jss";
import useButtonStyles from "../../../styles/buttonStyles";
import { joinGame } from "../../gameDetails/components/newPlayButton";

const useStyles = createUseStyles({
  button: {},
});

const JoinButton = props => {
  const [error, setError] = useState(null);
  const auth = AuthenticationStore.useContainer();
  const s = useStyles();
  const s2 = useButtonStyles();

  if (!props.placeId) {
    return null;
  }

  return (
    <>
      <div className={`alert-pjx alert-warning ${error ? "on" : ""}`}>
        <span className="alert-text">{error || ""}</span>
      </div>

      <Button
        noStyling={true}
        className={`${s.button} ${s2.newBuyButton}`}
        onClick={e => {
          if (!props.placeId) return;
          joinGame(e, props.placeId, auth, setError);
        }}
        style={{ width: "auto" }}
      >
        Join Game
      </Button>
    </>
  );
};

export default JoinButton;