/*
 * Copyright 2021 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React, { useState } from 'react';
import { useAsync, useEffectOnce } from 'react-use';
import { CatalogEntitiesRequest } from '@backstage/catalog-client';
import { Entity, makeValidator } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { FormControl, TextField } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import { FieldProps } from '@rjsf/core';

/**
 * EntityTagsPicker
 * @public
 */
export const EntityTagsPicker = ({
  formData,
  onChange,
  uiSchema,
}: FieldProps<string[]>) => {
  const catalogApi = useApi(catalogApiRef);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState(false);
  const tagValidator = makeValidator().isValidTag;
  const kinds = uiSchema['ui:options']?.kinds as string[];

  const { loading, value: existingTags } = useAsync(async () => {
    const tagsRequest: CatalogEntitiesRequest = { fields: ['metadata.tags'] };
    if (kinds) {
      tagsRequest.filter = { kind: kinds };
    }

    const entities = await catalogApi.getEntities(tagsRequest);

    return [
      ...new Set(
        entities.items
          .flatMap((e: Entity) => e.metadata?.tags)
          .filter(Boolean) as string[],
      ),
    ].sort();
  });

  const setTags = (_: React.ChangeEvent<{}>, values: string[] | null) => {
    // Reset error state in case all tags were removed
    let hasError = false;
    let addDuplicate = false;
    const currentTags = formData || [];

    // If adding a new tag
    if (values?.length && currentTags.length < values.length) {
      const newTag = (values[values.length - 1] = values[values.length - 1]
        .toLocaleLowerCase('en-US')
        .trim());
      hasError = !tagValidator(newTag);
      addDuplicate = currentTags.indexOf(newTag) !== -1;
    }

    setInputError(hasError);
    setInputValue(!hasError ? '' : inputValue);
    if (!hasError && !addDuplicate) {
      onChange(values || []);
    }
  };

  // Initialize field to always return an array
  useEffectOnce(() => onChange(formData || []));

  return (
    <FormControl margin="normal">
      <Autocomplete
        multiple
        freeSolo
        filterSelectedOptions
        onChange={setTags}
        value={formData || []}
        inputValue={inputValue}
        loading={loading}
        options={existingTags || []}
        ChipProps={{ size: 'small' }}
        renderInput={params => (
          <TextField
            {...params}
            label="Tags"
            onChange={e => setInputValue(e.target.value)}
            error={inputError}
            helperText="Add any relevant tags, hit 'Enter' to add new tags. Valid format: [a-z0-9+#] separated by [-], at most 63 characters"
          />
        )}
      />
    </FormControl>
  );
};
