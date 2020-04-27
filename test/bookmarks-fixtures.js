function makeBookmarksArray () {
  return [
    {
      id: 1,
      title: 'googs',
      url: 'https://www.google.com',
      description: '',
      rating: 5
    },
    {
      id: 2,
      title: 'github',
      url: 'https://www.github.com',
      description: 'where all the codes go',
      rating: 4
    },
  ]
}

module.exports = { 
  makeBookmarksArray
}