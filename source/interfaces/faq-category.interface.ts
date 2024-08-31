// This interface defines the properties for a FaqCategory object
export interface IFaqCategory {
  // A string containing the category name
  category_name: string;
  // A string containing the category description
  category_description: string;
  // A string containing the category alias
  cateogry_alias: string;
}

// This interface extends from Document and IFaqCategory interfaces.
export interface IFaqCategoryDocument extends Document, IFaqCategory {}
