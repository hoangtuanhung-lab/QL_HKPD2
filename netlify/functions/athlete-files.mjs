import { handleAthleteFiles } from "../lib/drive-files.mjs";
export default (request) => handleAthleteFiles(request, process.env);
