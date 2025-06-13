import { switchToScene } from "./lib/scene";
import "./style.css";
import "./scenes/mainConfig";
import "./scenes/mainInbox";
import "./scenes/mainModeration";
import "./scenes/mainScene";
import "./scenes/registerLogin";
import "./scenes/userDisplay";
import "./lib/settings"; // side effect: initiates theming

switchToScene("register-login");
