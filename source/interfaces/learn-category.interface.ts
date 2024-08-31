// Interface for the LearnCategory object
export interface ILearnCategory {
  // Name of the category
  category_name: string;
  // Description of the category
  category_description: string;
  // Alias of the category
  category_alias: string;
}

// Interface for the LearnCategory Document which extends the Document and ILearnCategory interfaces
export interface ILearnCategoryDocument extends Document, ILearnCategory {}
