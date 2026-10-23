import { Config } from '@remotion/cli/config';

// three.js a besoin de WebGL dans le Chrome de rendu : ANGLE fonctionne sur Mac (Apple Silicon)
Config.setChromiumOpenGlRenderer('angle');
// Images intermédiaires en PNG : pas d'artefacts de compression sur les textes fins
Config.setVideoImageFormat('png');
Config.setCrf(16);
