const map = (functionfn, iterator) => {
  const result = [];
  if (typeof iterator?.forEach == 'function') {
    iterator.forEach((item) => {
      const res = functionfn(item);
      if (res !== undefined) result.push(res);
    });
  } else {
    for (let item of iterator) {
      const res = functionfn(item);
      if (res !== undefined) result.push(res);
    }
  }
  return result;
};

export default map;
