export interface ReadRepository<TEntity, TId = string> {
  list(): Promise<readonly TEntity[]>;
  getById(id: TId): Promise<TEntity | null>;
}

export interface WriteRepository<TEntity, TCreate, TUpdate, TId = string> {
  create(input: TCreate): Promise<TEntity>;
  update(id: TId, input: TUpdate): Promise<TEntity>;
}

export type Repository<TEntity, TCreate, TUpdate, TId = string> =
  ReadRepository<TEntity, TId> & WriteRepository<TEntity, TCreate, TUpdate, TId>;
