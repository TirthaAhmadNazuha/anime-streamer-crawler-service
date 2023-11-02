import { readFileSync } from 'fs';

/**
 * Use for load file cookie
 * @param {URL} pathURL 
 * @returns {{ name: string, value: string }[]}
 */
const loadCookie = (pathURL, domain = '') => {
  const res = readFileSync(pathURL).toString();
  return res.split(';').map((prop) => {
    const [key, value] = prop.trim().split('=');
    return { name: key, value, domain };
  });
};

export default loadCookie;
