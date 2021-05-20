type Data<T> =
    | { value: T; done?: false }
    | { done: true };

export interface SourceResult<T> {
    emit: (value: T) => void;
    end: () => void;
    iterator: AsyncIterableIterator<T>;
}

export function createSource<T>(): SourceResult<T> {
    let resolver: ((data: Data<T>) => void) | undefined;
    const dataList: Array<Data<T>> = [];

    return {
        emit(value) {
            if (resolver) {
                resolver({ value });
                resolver = undefined;
            } else {
                dataList.push({ value });
            }
        },
        end() {
            if (resolver) {
                resolver({ done: true });
                resolver = undefined;
            } else {
                dataList.push({ done: true });
            }
        },
        iterator: async function*() {
            while (true) {
                const data = dataList.shift() ?? await new Promise<Data<T>>(resolve => {
                    resolver = resolve;
                });
                if (data.done) break;
                yield data.value;
            }
        }(),
    };
}
